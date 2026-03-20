from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import targets, scans
from .core.database import engine, Base
from .models import models

# Crear tablas en la base de datos (en producción usar Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SecTest VK API",
    description="API para la plataforma educativa de pentesting automatizado SecTest VK",
    version="0.1.0",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir Routers
app.include_router(targets.router)
app.include_router(scans.router)

@app.get("/")
async def root():
    return {
        "message": "Bienvenido a SecTest VK API",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
