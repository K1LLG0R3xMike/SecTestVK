from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class Finding(BaseModel):
    id: Optional[int] = None
    scan_id: Optional[int] = None
    title: str
    description: str
    severity: SeverityLevel
    tool: str
    evidence: Optional[str] = None

class AnalysisRequest(BaseModel):
    findings: List[Finding]
    scan_id: int
    provider: str = "claude"  # claude or openai

class AttackVector(BaseModel):
    name: str
    description: str
    probability: str  # HIGH, MEDIUM, LOW
    impact: str
    cve_references: Optional[List[str]] = None

class AnalysisResponse(BaseModel):
    scan_id: int
    provider: str
    attack_vectors: List[AttackVector]
    risk_score: float  # 1-10
    summary: str
    recommendations: List[str]
    combined_risk: Optional[str] = None  # CRITICAL, HIGH, MEDIUM, LOW
