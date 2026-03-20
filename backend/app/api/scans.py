from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models import models
from ..schemas import schemas
from ..core.celery_config import celery_app

router = APIRouter(prefix="/scans", tags=["scans"])

@router.post("/", response_model=schemas.Scan, status_code=status.HTTP_201_CREATED)
def start_scan(scan: schemas.ScanCreate, db: Session = Depends(get_db)):
    # 1. Verificar que el target exista
    target = db.query(models.Target).filter(models.Target.id == scan.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # 2. Crear registro de Scan en la DB
    new_scan = models.Scan(target_id=scan.target_id, status=models.ScanStatus.PENDING)
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    # 3. Encolar la tarea en Celery
    # Nota: Usamos el nombre de la tarea registrado en el worker
    try:
        celery_app.send_task("tasks.run_nmap_scan", args=[target.url_or_ip], task_id=str(new_scan.id))
        
        # Actualizar estado a RUNNING (opcional, el worker puede hacerlo)
        new_scan.status = models.ScanStatus.RUNNING
        db.commit()
        db.refresh(new_scan)
        
    except Exception as e:
        new_scan.status = models.ScanStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to queue scan: {str(e)}")

    return new_scan

@router.get("/", response_model=List[schemas.Scan])
def read_scans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    scans = db.query(models.Scan).offset(skip).limit(limit).all()
    return scans

@router.get("/{scan_id}", response_model=schemas.Scan)
def read_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
