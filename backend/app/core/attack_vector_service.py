import os
import httpx
import json
from typing import List, Optional
from ..models import models

class AttackVectorAnalysisService:
    def __init__(self):
        self.analyzer_host = os.getenv("AI_ANALYZER_HOST", "http://ai_analyzer:8001")
        self.provider = os.getenv("ANALYSIS_PROVIDER", "claude")
    
    async def get_health(self) -> dict:
        """Check if AI analyzer service is healthy."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.analyzer_host}/health")
                return response.json()
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}
    
    async def analyze_findings(
        self, 
        findings: List[models.Finding], 
        scan_id: int,
        provider: Optional[str] = None
    ) -> dict:
        """
        Send findings to AI analyzer service and get attack vector analysis.
        
        Args:
            findings: List of Finding objects from the scan
            scan_id: ID of the scan
            provider: AI provider (claude or openai), uses default if None
        
        Returns:
            Dict with analysis results
        """
        if not findings:
            return {"error": "No findings to analyze"}
        
        provider = provider or self.provider
        
        # Prepare findings for API
        findings_data = [
            {
                "id": f.id,
                "scan_id": f.scan_id,
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "tool": f.tool,
                "evidence": f.evidence or ""
            }
            for f in findings
        ]
        
        payload = {
            "findings": findings_data,
            "scan_id": scan_id,
            "provider": provider
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.analyzer_host}/analyze",
                    json=payload
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        "error": f"Analyzer returned {response.status_code}",
                        "detail": response.text
                    }
        
        except httpx.TimeoutException:
            return {"error": "Analyzer request timed out (30s)"}
        except Exception as e:
            return {"error": f"Failed to contact analyzer: {str(e)}"}
    
    async def get_providers(self) -> dict:
        """Get list of available AI providers."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.analyzer_host}/providers")
                return response.json()
        except Exception as e:
            return {"error": str(e)}

# Singleton instance
attack_vector_service = AttackVectorAnalysisService()
