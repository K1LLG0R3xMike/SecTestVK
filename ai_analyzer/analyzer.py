import os
import json
import re
import requests
from typing import List
from models import Finding, AnalysisResponse, AttackVector
from openai import OpenAI

class AttackVectorAnalyzer:
    def __init__(self):
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.openai_client = None
        
        # Initialize OpenAI if API key exists
        if os.getenv("OPENAI_API_KEY"):
            self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def _findings_to_text(self, findings: List[Finding]) -> str:
        """Convert findings list to readable format for LLM."""
        text = "SECURITY FINDINGS:\n\n"
        for i, f in enumerate(findings, 1):
            text += f"{i}. [{f.severity.upper()}] {f.title}\n"
            text += f"   Tool: {f.tool}\n"
            text += f"   Description: {f.description}\n"
            if f.evidence:
                text += f"   Evidence: {f.evidence[:200]}\n"
            text += "\n"
        return text

    def _parse_claude_response(self, response_text: str, scan_id: int) -> AnalysisResponse:
        """Parse Claude response into structured format."""
        attack_vectors = []
        recommendations = []
        risk_score = 5.0
        summary = ""
        combined_risk = "MEDIUM"
        
        # Try to extract JSON-like sections
        try:
            # Extract risk score
            risk_match = re.search(r'risk.*(?:score|level)[:\s]*(\d+\.?\d*)', response_text, re.IGNORECASE)
            if risk_match:
                risk_score = float(risk_match.group(1))
                if risk_score > 8:
                    combined_risk = "CRITICAL"
                elif risk_score > 6:
                    combined_risk = "HIGH"
                elif risk_score > 4:
                    combined_risk = "MEDIUM"
                else:
                    combined_risk = "LOW"
            
            # Extract summary (first paragraph)
            lines = response_text.split('\n')
            summary = next((line.strip() for line in lines if line.strip() and len(line.strip()) > 20), "Analysis completed")
            
            # Extract attack vectors (look for numbered lists)
            vector_pattern = r'^\d+\.\s+([^\n:]+)[:\s]*([^\n]+)'
            vectors = re.findall(vector_pattern, response_text, re.MULTILINE)
            for name, desc in vectors[:5]:  # Max 5 vectors
                # Assign probability based on text keywords
                probability = "MEDIUM"
                if any(kw in desc.lower() for kw in ["easily", "trivial", "simple", "high"]):
                    probability = "HIGH"
                elif any(kw in desc.lower() for kw in ["rare", "uncommon", "difficult"]):
                    probability = "LOW"
                
                attack_vectors.append(AttackVector(
                    name=name.strip(),
                    description=desc.strip()[:200],
                    probability=probability,
                    impact="High" if "critical" in name.lower() else "Medium"
                ))
            
            # Extract recommendations
            rec_pattern = r'(?:recom|fix|action|mitigation)[^\n]*:\s*([^\n]+)'
            recs = re.findall(rec_pattern, response_text, re.IGNORECASE)
            recommendations = [r.strip() for r in recs[:5]]
            
        except Exception as e:
            print(f"Error parsing Claude response: {e}")
        
        # Ensure we have at least placeholders
        if not attack_vectors:
            attack_vectors = [AttackVector(
                name="General Assessment",
                description=summary,
                probability="MEDIUM",
                impact="Medium"
            )]
        
        if not recommendations:
            recommendations = ["Review findings and prioritize remediation by severity"]
        
        return AnalysisResponse(
            scan_id=scan_id,
            provider="claude",
            attack_vectors=attack_vectors,
            risk_score=risk_score,
            summary=summary,
            recommendations=recommendations,
            combined_risk=combined_risk
        )

    def _parse_openai_response(self, response_text: str, scan_id: int) -> AnalysisResponse:
        """Parse OpenAI response (similar to Claude)."""
        # Same parsing logic as Claude for consistency
        return self._parse_claude_response(response_text, scan_id)

    async def analyze_with_claude(self, findings: List[Finding], scan_id: int) -> AnalysisResponse:
        """Analyze findings using Claude API."""
        if not self.claude_api_key:
            raise ValueError("Claude API key not configured (CLAUDE_API_KEY)")
        
        findings_text = self._findings_to_text(findings)
        
        prompt = f"""You are a senior security researcher and penetration tester. Analyze the following detected security findings and identify potential attack vectors.

{findings_text}

Provide analysis in this format:

RISK SCORE: [1-10]
SUMMARY: [Brief overview of overall risk posture]

ATTACK VECTORS:
1. [Vector Name] - [Description and impact]
2. [Vector Name] - [Description and impact]
3. [Vector Name] - [Description and impact]

REMEDIATION RECOMMENDATIONS:
1. [Priority action]
2. [Priority action]
3. [Priority action]

Focus on realistic attack chains and how findings could be chained together for maximum impact.
"""
        
        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.claude_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()

            blocks = payload.get("content") or []
            response_text = "\n".join(
                block.get("text", "") for block in blocks if isinstance(block, dict)
            ).strip()
            if not response_text:
                response_text = "Analysis completed"

            return self._parse_claude_response(response_text, scan_id)
        
        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")

    async def analyze_with_openai(self, findings: List[Finding], scan_id: int) -> AnalysisResponse:
        """Analyze findings using OpenAI API."""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured (OPENAI_API_KEY)")
        
        findings_text = self._findings_to_text(findings)
        
        prompt = f"""You are a senior security researcher and penetration tester. Analyze the following detected security findings and identify potential attack vectors.

{findings_text}

Provide analysis in this format:

RISK SCORE: [1-10]
SUMMARY: [Brief overview of overall risk posture]

ATTACK VECTORS:
1. [Vector Name] - [Description and impact]
2. [Vector Name] - [Description and impact]
3. [Vector Name] - [Description and impact]

REMEDIATION RECOMMENDATIONS:
1. [Priority action]
2. [Priority action]
3. [Priority action]

Focus on realistic attack chains and how findings could be chained together for maximum impact.
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": "You are a senior security researcher."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            response_text = response.choices[0].message.content
            return self._parse_openai_response(response_text, scan_id)
        
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    async def analyze(self, findings: List[Finding], scan_id: int, provider: str = "claude") -> AnalysisResponse:
        """Main analysis method - routes to appropriate provider."""
        if provider == "claude":
            return await self.analyze_with_claude(findings, scan_id)
        elif provider == "openai":
            return await self.analyze_with_openai(findings, scan_id)
        else:
            raise ValueError(f"Unknown provider: {provider}")

# Global analyzer instance
analyzer = AttackVectorAnalyzer()
