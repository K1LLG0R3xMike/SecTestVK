from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

# --- Target Schemas ---
class TargetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    url_or_ip: str = Field(..., description="Target URL or IP address")
    description: Optional[str] = None

class TargetCreate(TargetBase):
    pass

class TargetUpdate(TargetBase):
    name: Optional[str] = None
    url_or_ip: Optional[str] = None

class Target(TargetBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Finding Schemas ---
class FindingBase(BaseModel):
    title: str
    description: str
    severity: Severity
    tool: str
    evidence: Optional[str] = None
    mitigation: Optional[str] = None
    owasp_category: Optional[str] = None

class FindingCreate(FindingBase):
    scan_id: int

class Finding(FindingBase):
    id: int
    scan_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Scan Schemas ---
class ScanBase(BaseModel):
    target_id: int

class ScanCreate(ScanBase):
    config: Optional[dict] = {
        "nmap": True,
        "gobuster": True,
        "nuclei": False,
        "whatweb": False,
        "nikto": False,
        "sslscan": False,
        "zap": False
    }
    force: bool = False

class ScanUpdate(BaseModel):
    status: Optional[ScanStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    end_time: Optional[datetime] = None

class Scan(ScanBase):
    id: int
    status: ScanStatus
    progress: int
    logs: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    findings: List[Finding] = []
    target: Optional[Target] = None

    class Config:
        from_attributes = True

# --- Summary Schemas ---
class SeverityDistribution(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0

class DashboardSummary(BaseModel):
    total_scans: int
    vulnerabilities_found: int
    active_scans_count: int
    security_score: str
    severity_distribution: SeverityDistribution
    recent_findings: List[Finding]
    active_scans: List[Scan]
