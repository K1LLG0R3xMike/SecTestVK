from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
from ..core.database import get_db
from ..models import models
from ..schemas import schemas
from ..core.celery_config import celery_app
from ..core.ai_service import AIService, ai_service
from ..core.report_generator import report_generator

router = APIRouter(prefix="/scans", tags=["scans"])

@router.post("/", response_model=schemas.Scan)
def create_scan(scan: schemas.ScanCreate, db: Session = Depends(get_db)):
    db_target = db.query(models.Target).filter(models.Target.id == scan.target_id).first()
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # Check if there's already an active scan for this target
    # We only block if there is a scan created in the last 30 minutes that is still running/pending
    time_threshold = datetime.utcnow() - timedelta(minutes=30)
    
    active_scan = db.query(models.Scan).filter(
        models.Scan.target_id == scan.target_id,
        models.Scan.status.in_([models.ScanStatus.PENDING, models.ScanStatus.RUNNING]),
        models.Scan.start_time > time_threshold
    ).first()
    
    if active_scan and not scan.force:
        raise HTTPException(
            status_code=400, 
            detail=f"A scan is already in progress (started at {active_scan.start_time}). Use 'force' to override."
        )

    # If there are older "active" scans or we are forcing, we mark them as failed
    stuck_scans_query = db.query(models.Scan).filter(
        models.Scan.target_id == scan.target_id,
        models.Scan.status.in_([models.ScanStatus.PENDING, models.ScanStatus.RUNNING])
    )
    
    if not scan.force:
        stuck_scans_query = stuck_scans_query.filter(models.Scan.start_time <= time_threshold)
    
    stuck_scans = stuck_scans_query.all()
    
    for stuck in stuck_scans:
        stuck.status = models.ScanStatus.FAILED
        reason = "inactivity/timeout" if not scan.force else "manual override"
        stuck.logs = (stuck.logs or "") + f"\n[SYSTEM] Scan marked as FAILED due to {reason}."
    
    db.commit()

    scan_data = scan.model_dump()
    config = scan_data.pop("config", {})
    force = scan_data.pop("force", False)
    new_scan = models.Scan(**scan_data)
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    # Enviar tarea a Celery con la configuración personalizada
    celery_app.send_task(
        "tasks.run_combined_scan",
        args=[new_scan.id, db_target.url_or_ip, config],
        task_id=str(new_scan.id)
    )
    
    return new_scan

@router.get("/{scan_id}/report/pdf")
async def generate_scan_report(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Obtener hallazgos para el análisis
    findings = scan.findings
    
    # Generar análisis de IA
    local_ai_service = AIService()
    ai_analysis = await local_ai_service.analyze_findings(findings)
    
    # Preparar datos para el generador
    scan_data = {
        "id": scan.id,
        "target": {"url_or_ip": scan.target.url_or_ip},
        "start_time": scan.start_time,
        "end_time": scan.end_time or datetime.utcnow(),
        "status": scan.status,
        "findings": findings
    }
    
    # Generar PDF
    try:
        pdf_file = report_generator.generate_pdf(scan_data, ai_analysis)
        
        filename = f"report_scan_{scan_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_file,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.get("/stats", response_model=schemas.DashboardSummary)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_scans = db.query(models.Scan).count()
    vulnerabilities_found = db.query(models.Finding).count()
    active_scans = db.query(models.Scan).filter(
        models.Scan.status.in_([models.ScanStatus.PENDING, models.ScanStatus.RUNNING])
    ).all()
    # Ensure targets are loaded for active scans
    for s in active_scans:
        _ = s.target
    
    # Severity distribution
    severities = db.query(models.Finding.severity, func.count(models.Finding.id)).group_by(models.Finding.severity).all()
    dist = schemas.SeverityDistribution()
    for sev, count in severities:
        if sev == "critical": dist.critical = count
        elif sev == "high": dist.high = count
        elif sev == "medium": dist.medium = count
        elif sev == "low": dist.low = count
        elif sev == "info": dist.info = count
    
    # Recent findings
    recent_findings = db.query(models.Finding).order_by(models.Finding.created_at.desc()).limit(5).all()
    
    # Calculate dummy security score (can be improved later)
    # Critical -20, High -10, Medium -5, Low -1
    total_deduction = (dist.critical * 20) + (dist.high * 10) + (dist.medium * 5) + (dist.low * 1)
    base_score = 100
    score_num = max(0, base_score - total_deduction)
    
    if score_num >= 90: score_str = "A+"
    elif score_num >= 80: score_str = "A"
    elif score_num >= 70: score_str = "B+"
    elif score_num >= 60: score_str = "B"
    elif score_num >= 50: score_str = "C"
    else: score_str = "F"

    return {
        "total_scans": total_scans,
        "vulnerabilities_found": vulnerabilities_found,
        "active_scans_count": len(active_scans),
        "security_score": score_str,
        "severity_distribution": dist,
        "recent_findings": recent_findings,
        "active_scans": active_scans
    }

@router.get("/", response_model=List[schemas.Scan])
def read_scans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    scans = db.query(models.Scan).order_by(models.Scan.start_time.desc()).offset(skip).limit(limit).all()
    # Aseguramos que los targets estén cargados para que el frontend tenga el nombre
    for scan in scans:
        _ = scan.target # Trigger lazy load if needed
    return scans

@router.get("/{scan_id}", response_model=schemas.Scan)
def read_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.post("/{scan_id}/cancel")
def cancel_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in [models.ScanStatus.PENDING, models.ScanStatus.RUNNING]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel scan in state {scan.status}")
    
    try:
        # Revocar la tarea en Celery
        # terminate=True envía SIGTERM al proceso hijo (Nmap/Gobuster)
        # signal='SIGKILL' para asegurar que se detenga inmediatamente
        celery_app.control.revoke(str(scan_id), terminate=True, signal='SIGKILL')
        
        # Actualizar estado en DB
        scan.status = models.ScanStatus.FAILED # O añadir models.ScanStatus.CANCELLED si existiera
        db.commit()
        
        return {"detail": "Scan cancellation request sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel scan: {str(e)}")
