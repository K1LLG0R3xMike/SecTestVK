from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.models import ToolConfig, CustomScript
from ..schemas.schemas import (
    ToolConfig as ToolConfigSchema,
    ToolConfigUpdate,
    CustomScript as CustomScriptSchema,
    CustomScriptCreate,
    CustomScriptUpdate,
)

router = APIRouter(tags=["scripts"])

TOOL_DEFAULTS = {
    "nmap":        "nmap -sV -T4 -F -v {target}",
    "gobuster":    "gobuster dir -u {target} -w /opt/wordlists/common.txt -t 50 -v --no-error",
    "whatweb":     "whatweb -v {target}",
    "sslscan":     "sslscan --no-colour {target}",
    "nuclei":      "nuclei -u {target} -severity low,medium,high,critical -no-color -ni -stats -timeout 10 -retries 2 -mhe 10",
    "nikto":       "nikto -h {target} -Tuning 1,2,3,4,5,7,8,9,0 -nointeractive -Display V",
    "ffuf":        "ffuf -u {target}/FUZZ -w /opt/wordlists/api-endpoints.txt -mc 200,201,204,301,302,307,401,403 -t 50",
    "katana":      "katana -u {target} -d 3 -silent -nc",
    "kiterunner":  "kr brute {target} -w /opt/wordlists/api-endpoints.txt --fail-status-codes 404 -x 20 --timeout 3s -o text --progress=false",
}

TOOL_DESCRIPTIONS = {
    "nmap":        "Port and service discovery (-sV version detection, -F fast scan, -T4 timing)",
    "gobuster":    "Directory and file brute-force using wordlist",
    "whatweb":     "Web technology fingerprinting",
    "sslscan":     "TLS/SSL configuration analysis",
    "nuclei":      "Vulnerability scanning using community templates",
    "nikto":       "Web server misconfiguration and vulnerability scanner",
    "ffuf":        "API endpoint fuzzing with custom wordlist",
    "katana":      "Web crawler (depth-3, silent mode)",
    "kiterunner":  "API route discovery using wordlist-based brute-force",
}


# ── Tool Configs ─────────────────────────────────────────────────────────────

@router.get("/tool-configs/", response_model=List[ToolConfigSchema])
def list_tool_configs(db: Session = Depends(get_db)):
    """Return all tool configs, filling in defaults for tools without a DB record."""
    db_configs = {tc.tool_name: tc for tc in db.query(ToolConfig).all()}
    result = []
    for tool_name, default_cmd in TOOL_DEFAULTS.items():
        if tool_name in db_configs:
            result.append(db_configs[tool_name])
        else:
            # Return a virtual record (not persisted) so the frontend always sees all tools
            result.append(ToolConfig(
                id=0,
                tool_name=tool_name,
                command_template=default_cmd,
                description=TOOL_DESCRIPTIONS.get(tool_name),
                enabled=True,
            ))
    return result


@router.put("/tool-configs/{tool_name}", response_model=ToolConfigSchema)
def update_tool_config(tool_name: str, payload: ToolConfigUpdate, db: Session = Depends(get_db)):
    if tool_name not in TOOL_DEFAULTS:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not recognized")
    if "{target}" not in payload.command_template:
        raise HTTPException(status_code=422, detail="command_template must contain {target}")

    tc = db.query(ToolConfig).filter(ToolConfig.tool_name == tool_name).first()
    if tc:
        tc.command_template = payload.command_template
        tc.description = payload.description
        tc.enabled = payload.enabled
    else:
        tc = ToolConfig(
            tool_name=tool_name,
            command_template=payload.command_template,
            description=payload.description or TOOL_DESCRIPTIONS.get(tool_name),
            enabled=payload.enabled,
        )
        db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.post("/tool-configs/{tool_name}/reset", response_model=ToolConfigSchema)
def reset_tool_config(tool_name: str, db: Session = Depends(get_db)):
    if tool_name not in TOOL_DEFAULTS:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not recognized")
    tc = db.query(ToolConfig).filter(ToolConfig.tool_name == tool_name).first()
    if tc:
        db.delete(tc)
        db.commit()
    return ToolConfig(
        id=0,
        tool_name=tool_name,
        command_template=TOOL_DEFAULTS[tool_name],
        description=TOOL_DESCRIPTIONS.get(tool_name),
        enabled=True,
    )


# ── Custom Scripts ────────────────────────────────────────────────────────────

@router.get("/scripts/", response_model=List[CustomScriptSchema])
def list_scripts(db: Session = Depends(get_db)):
    return db.query(CustomScript).order_by(CustomScript.created_at.desc()).all()


@router.post("/scripts/", response_model=CustomScriptSchema, status_code=201)
def create_script(payload: CustomScriptCreate, db: Session = Depends(get_db)):
    script = CustomScript(**payload.model_dump())
    db.add(script)
    db.commit()
    db.refresh(script)
    return script


@router.get("/scripts/{script_id}", response_model=CustomScriptSchema)
def get_script(script_id: int, db: Session = Depends(get_db)):
    script = db.query(CustomScript).filter(CustomScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.put("/scripts/{script_id}", response_model=CustomScriptSchema)
def update_script(script_id: int, payload: CustomScriptUpdate, db: Session = Depends(get_db)):
    script = db.query(CustomScript).filter(CustomScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    for field, value in payload.model_dump().items():
        setattr(script, field, value)
    db.commit()
    db.refresh(script)
    return script


@router.delete("/scripts/{script_id}", status_code=204)
def delete_script(script_id: int, db: Session = Depends(get_db)):
    script = db.query(CustomScript).filter(CustomScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    db.delete(script)
    db.commit()
