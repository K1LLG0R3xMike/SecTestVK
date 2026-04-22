import os
import json
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

        prompt = f"""
        You are a Senior Pentester and Security Analyst. 
        Analyze the following security findings detected during a scan:
        
        {findings_context}
        
        Please provide a concise Executive Summary for a technical report.
        Focus on:
        1. The overall security posture.
        2. Critical/High risks and their potential impact.
        3. Strategic recommendations for remediation.
        
        Keep it professional, direct, and actionable. Avoid long technical logs.
        Format the output in Markdown.
        """

        try:
            # Usando el cliente de Ollama
            response = self.client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert cybersecurity analyst specialized in automated pentesting reports."},
                    {"role": "user", "content": prompt}
                ],
                stream=False
            )
            return response['message']['content']
        except Exception as e:
            return f"Error during AI analysis with Ollama Cloud ({self.model}): {str(e)}"

ai_service = AIService()
