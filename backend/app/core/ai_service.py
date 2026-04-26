import os
import json
import re
import html
from ollama import Client
from typing import List
from ..models import models
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OLLAMA_API_KEY")
        self.host = os.getenv("OLLAMA_HOST", "https://ollama.com")
        self.model = os.getenv("AI_MODEL", "llama3")
        
        # Configurar cliente oficial de Ollama
        if self.api_key:
            self.client = Client(
                host=self.host,
                headers={'Authorization': f'Bearer {self.api_key}'}
            )
            self.enabled = True
        else:
            self.client = None
            self.enabled = False

    def _sanitize_ai_text(self, text: str) -> str:
        if not text:
            return ""

        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = re.sub(r"```[\s\S]*?```", "", normalized)
        normalized = re.sub(r"`([^`]+)`", r"\1", normalized)
        normalized = re.sub(r"^\s{0,3}#{1,6}\s+", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"^\s{0,3}>\s?", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"^\s{0,3}([-*+])\s+", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"\*\*(.*?)\*\*", r"\1", normalized)
        normalized = re.sub(r"__(.*?)__", r"\1", normalized)
        normalized = re.sub(r"\*(.*?)\*", r"\1", normalized)
        normalized = re.sub(r"_(.*?)_", r"\1", normalized)
        normalized = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", normalized)
        normalized = re.sub(r"^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$", "", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
        return html.escape(normalized)

    async def analyze_findings(self, findings: List[models.Finding]) -> str:
        if not self.enabled:
            return "AI Analysis is disabled. Please provide an OLLAMA_API_KEY in the backend environment."

        if not findings:
            return "No findings to analyze."

        # Preparar el contexto para la IA
        findings_context = ""
        for i, f in enumerate(findings):
            findings_context += f"{i+1}. Tool: {f.tool} | Title: {f.title} | Severity: {f.severity}\n"
            findings_context += f"   Description: {f.description}\n"
            if f.evidence:
                findings_context += f"   Evidence Snippet: {f.evidence[:200]}...\n"
            findings_context += "---\n"

        prompt = f"""Analyze the following security findings detected during a scan:

{findings_context}

Return ONLY plain text. Do not use Markdown. Do not use headings that start with #. Do not use bold/italics markers like ** or _. Do not use code blocks or backticks. Do not include links.

Use EXACTLY this format and section titles:

OVERVIEW:
(3-5 sentences describing overall posture and what was assessed)

TOP RISKS:
1) (Critical/High risk + impact in 1-2 sentences)
2) (Critical/High risk + impact in 1-2 sentences)
3) (If applicable, otherwise write: N/A)

RECOMMENDATIONS:
1) (Actionable remediation, prioritized)
2) (Actionable remediation, prioritized)
3) (Actionable remediation, prioritized)

NOTES:
(Any important constraints/assumptions in 1-2 lines. If none: N/A)
"""

        try:
            # Usando el cliente de Ollama
            response = self.client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior pentester writing executive summaries for PDF reports. Output must be plain text only."},
                    {"role": "user", "content": prompt}
                ],
                stream=False
            )
            content = response['message']['content']
            return self._sanitize_ai_text(content)
        except Exception as e:
            return f"Error during AI analysis with Ollama Cloud ({self.model}): {str(e)}"

ai_service = AIService()
