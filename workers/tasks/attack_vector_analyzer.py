import asyncio
import json
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Models for worker (simplified)
Base = declarative_base()

class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer)
    status = Column(String)
    progress = Column(Integer)
    logs = Column(Text)
    attack_vector_analysis = Column(Text, nullable=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    title = Column(String)
    description = Column(Text)
    severity = Column(String)
    tool = Column(String)
    evidence = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# DB Config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sectest:sectest123@db:5432/sectest_vk")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_scan_findings(scan_id: int):
    """Fetch findings for a scan from DB."""
    session = SessionLocal()
    try:
        findings = session.query(Finding).filter(Finding.scan_id == scan_id).all()
        return findings
    finally:
        session.close()

def save_attack_vector_analysis(scan_id: int, analysis: dict):
    """Save attack vector analysis to DB."""
    session = SessionLocal()
    try:
        scan = session.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.attack_vector_analysis = json.dumps(analysis)
            session.commit()
            return True
    finally:
        session.close()
    return False

async def call_analyzer_service(findings: list, scan_id: int, provider: str = "claude") -> dict:
    """
    Call the AI analyzer service via HTTP.
    
    This is called by Celery task to analyze findings.
    """
    import httpx
    
    analyzer_host = os.getenv("AI_ANALYZER_HOST", "http://ai_analyzer:8001")
    
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
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{analyzer_host}/analyze",
                json=payload
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "error": f"Analyzer error {response.status_code}",
                    "detail": response.text
                }
    except Exception as e:
        return {"error": str(e)}
