# SecTest VK

Plataforma de pentesting automatizado con orquestación de herramientas, registro en tiempo real, gestión de proyectos/targets, panel de métricas y generación de reportes PDF con resumen ejecutivo asistido por IA (Ollama Cloud).

## Diseño (Arquitectura)

Servicios principales (Docker Compose):

- **Frontend (React + Vite)**: UI (Dashboard, Projects, Scans, Findings, Reports).
- **Backend (FastAPI)**: API REST, persistencia en PostgreSQL, endpoint de reportes PDF.
- **Worker (Celery)**: ejecuta el pipeline de escaneo y guarda logs/hallazgos.
- **Redis**: broker de Celery.
- **PostgreSQL**: almacenamiento de scans, targets y findings.

Flujo:

1. El usuario crea un **Target/Project** en el frontend.
2. El backend crea un **Scan** y envía la tarea a Celery.
3. El worker ejecuta herramientas **secuencialmente** (según checklist/config) y:
   - persiste logs en la tabla `scans.logs`
   - genera findings normalizados en la tabla `findings`
4. El frontend consume:
   - `/scans/` para listado y estado
   - `/scans/stats` para métricas del dashboard
   - `/scans/{id}/report/pdf` para descargar el PDF

## Funcionalidades

- **Gestión de Targets/Projects**
  - Crear/listar targets desde la UI.
  - Iniciar escaneos con configuración por herramienta (checklist).

- **Orquestación de escaneo (Worker)**
  - Pipeline secuencial para estabilidad y orden de logs.
  - Herramientas integradas: **Nmap**, **Gobuster**, **WhatWeb**, **SSLScan**, **Nuclei**, **Nikto**.
  - Manejo tolerante a fallos: si una herramienta no existe o falla, el scan continúa (se registra en logs).
  - Protección contra wildcard/403/404 constantes en Gobuster (exclude-length por probing).

- **Scans + Logs en vivo**
  - Estado del scan (pending/running/completed/failed).
  - Progreso y logs persistidos y visibles desde la UI.
  - Endpoint para **cancelar** scans activos.

- **Findings normalizados**
  - Los resultados se guardan por scan y se presentan agrupados por target/scan.
  - Severidad: critical/high/medium/low/info (según parser de herramienta).

- **Dashboard**
  - Totales, distribución de severidades, scans activos y score aproximado.

- **Reportes (PDF + IA)**
  - Endpoint: `GET /scans/{scan_id}/report/pdf`
  - Genera un PDF usando plantilla HTML + `xhtml2pdf`.
  - Solicita a **Ollama Cloud** un resumen ejecutivo en Markdown a partir de los findings.

## Endpoints principales (Backend)

- `GET /docs` (Swagger)
- `GET /health`
- `GET /targets/` / `POST /targets/`
- `GET /scans/` / `POST /scans/`
- `POST /scans/{scan_id}/cancel`
- `GET /scans/stats`
- `GET /scans/{scan_id}/report/pdf`

## Variables de entorno

El compose carga variables desde el archivo `.env` (en la raíz del repo).

Ejemplo recomendado:

```env
POSTGRES_USER=sectest
POSTGRES_PASSWORD=sectest123
POSTGRES_DB=sectest_vk

DATABASE_URL=postgresql://sectest:sectest123@db:5432/sectest_vk
REDIS_URL=redis://redis:6379/0

OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=REEMPLAZA_CON_TU_API_KEY
AI_MODEL=llama3
```

## Cómo levantar el proyecto (Docker)

Desde la raíz:

```bash
docker-compose up --build
```

URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs

Para detener:

```bash
docker-compose down
```

Para detener y borrar volúmenes (borra la DB):

```bash
docker-compose down -v
```

## Comandos útiles

- Reiniciar solo backend:
  - `docker-compose restart backend`
- Reiniciar solo worker:
  - `docker-compose restart worker`
- Ver logs:
  - `docker logs sectest_backend --tail 200`
  - `docker logs sectest_worker --tail 200`

## Desarrollo local (opcional)

Si quieres correr el frontend fuera de Docker:

```bash
cd frontend
npm install
npm run dev
```

Configura `VITE_API_URL` si el backend no está en `http://localhost:8000`.

## Notas operativas

- El worker instala herramientas dentro del contenedor y utiliza una wordlist de SecLists (`common.txt`) para Gobuster.
- La IA para reportes usa el SDK oficial (`ollama`) y requiere `OLLAMA_API_KEY` válido.
