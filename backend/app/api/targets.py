from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/targets", tags=["targets"])

@router.post("/", response_model=schemas.Target, status_code=status.HTTP_201_CREATED)
def create_target(target: schemas.TargetCreate, db: Session = Depends(get_db)):
    db_target = db.query(models.Target).filter(models.Target.url_or_ip == target.url_or_ip).first()
    if db_target:
        raise HTTPException(status_code=400, detail="Target already exists")
    
    new_target = models.Target(**target.model_dump())
    db.add(new_target)
    db.commit()
    db.refresh(new_target)
    return new_target

@router.get("/", response_model=List[schemas.Target])
def read_targets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    targets = db.query(models.Target).offset(skip).limit(limit).all()
    return targets

@router.get("/{target_id}", response_model=schemas.Target)
def read_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target

@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return None
