# Attack Vector Analysis Integration - Diseño Arquitectónico

## Estado Actual
- **AI Service**: `backend/app/core/ai_service.py` conecta a Ollama Cloud para generar resúmenes de reportes PDF
- **Modelo**: Llama3 vía Ollama (local o cloud, según config)
- **Uso**: Solo en generación de PDF, no interactivo

---

## Opciones de Arquitectura

### OPCIÓN 1: Servicio Dedicado + Microservicio (RECOMENDADO)

**Ventajas:**
- Separación clara de responsabilidades  
- Escalabilidad independiente del backend
- Fácil cambiar modelos/providers (Claude → OpenAI → local LLM)
- Análisis async sin bloquear requests HTTP

**Arquitectura:**
```
Frontend
   ↓
Backend (FastAPI)
   ├→ GET /scans/{id}/analysis/vectors  [endpoint orquestador]
   │     ↓ (verifica cache Redis)
   │     ↓ (si no existe, envía task Celery)
   │
   └→ Worker (Celery)
        ↓ (task: analyze_attack_vectors)
        └→ Analysis Service (nuevo Docker)
             ↓
             └→ Claude API / OpenAI API
```

**Nuevo servicio (`ai_analyzer/`):**
```
ai_analyzer/
  ├── Dockerfile
  ├── requirements.txt
  ├── main.py (FastAPI con endpoint /analyze/vectors)
  ├── analyzer.py (lógica de análisis)
  └── models.py (Pydantic schemas)
```

### OPCIÓN 2: Ampliar AI Service Existente (SIMPLE)

**Ventajas:**
- Sin nuevo contenedor
- Reutiliza código existente

**Desventajas:**
- Análisis sync = bloquea requests HTTP
- Acoplamiento: reportes + análisis en mismo servicio
- Escala difícil si análisis es muy lento

**Implementación:**
- Agregar método `analyze_attack_vectors(findings)` a `AIService`
- Endpoint en backend: `/scans/{id}/analysis/vectors`
- Parámetro env: `ANALYSIS_PROVIDER=claude|ollama|openai`

### OPCIÓN 3: Task Celery Pura (MID-GROUND)

**Ventajas:**
- Análisis async (no bloquea)
- Reutiliza infraestructura Celery existente
- Sin nuevo Docker

**Desventajas:**
- Menos separación de concerns
- Los modelos están en el mismo código que herramientas de scanning

---

## Consideraciones Críticas

### 1. **Seguridad**
- **API Keys**: Claude, OpenAI, etc. deben estar en `.env` (no en docker-compose)
- **Data Privacy**: ¿Enviar findings reales a APIs externas? ⚠️
  - Opción: Sanitizar/resumir datos antes de enviar
  - Opción: Usar modelos locales (Ollama, Mistral local, etc.)
- **Rate Limits**: Implementar queue + throttling en Celery
- **Logging**: No loguear prompts completos en stdout

### 2. **Costo**
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens
- **Estima**: ~1000 tokens por análisis de findings = ~$0.003 por scan
- **Solución**: Cachear resultados 24h en Redis

### 3. **Latencia**
- **Claude API**: 3-10s típico
- **Local (Ollama)**: 30-60s (depende de hardware)
- **Solución**: 
  - Análisis async via Celery
  - UI muestra loading + resultados cuando estén listos
  - WebSocket opcional para updates en tiempo real

### 4. **UI/UX**
- **Ubicación ideal**: Nueva tab "Attack Vector Analysis" en Findings
- **Flujo**:
  1. User ve findings → botón "Analyze attack vectors"
  2. Celery task inicia en background
  3. UI muestra "Analysis in progress..."
  4. Resultados aparecen cuando estén listos (polling o WebSocket)
- **Caché**: Si ya se analizó, mostrar resultado inmediatamente

### 5. **Persistencia**
- ¿Guardar análisis en DB o solo caché?
  - **Recomendación**: Columna `scan.attack_vector_analysis` (TEXT, nullable)
  - Así el análisis persiste si el cache se limpia

---

## Flujo End-to-End Recomendado

### Backend Changes:
```python
# backend/app/api/scans.py
@router.post("/{scan_id}/analysis/vectors")
async def request_attack_vector_analysis(scan_id: int, db: Session):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not scan.findings:
        raise HTTPException(404, "Scan or findings not found")
    
    # Check cache first
    cached = redis.get(f"attack_vector_analysis:{scan_id}")
    if cached:
        return {"status": "cached", "analysis": json.loads(cached)}
    
    # Check if already in DB
    if scan.attack_vector_analysis:
        return {"status": "stored", "analysis": scan.attack_vector_analysis}
    
    # Enqueue task
    task = celery_app.send_task(
        'tasks.analyze_attack_vectors',
        args=[scan_id],
        countdown=0  # Immediate
    )
    
    return {"status": "queued", "task_id": task.id}

@router.get("/{scan_id}/analysis/vectors/status/{task_id}")
async def get_analysis_status(scan_id: int, task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    if task_result.ready():
        if task_result.successful():
            analysis = task_result.result
            # Cache for 24h
            redis.set(f"attack_vector_analysis:{scan_id}", json.dumps(analysis), ex=86400)
            return {"status": "completed", "analysis": analysis}
        else:
            return {"status": "failed", "error": str(task_result.info)}
    return {"status": "pending"}
```

### Worker Changes:
```python
# workers/tasks/scan_tasks.py
@celery_app.task(name="tasks.analyze_attack_vectors")
def analyze_attack_vectors(scan_id):
    findings = get_scan_findings(scan_id)  # DB query
    
    # Option A: Claude API (payload minimizado)
    analysis = call_claude_analyzer(findings)
    
    # Option B: Local Ollama
    # analysis = call_ollama_analyzer(findings)
    
    # Save to DB
    save_scan_analysis(scan_id, analysis)
    
    return analysis
```

### Frontend Changes:
```jsx
// frontend/src/components/AttackVectorAnalysisPanel.jsx
- New component
- Inline in Findings.jsx or separate page
- Polling endpoint /scans/{id}/analysis/vectors/status/{taskId}
- Show loading → results
```

---

## Plan de Implementación (Recommended Path)

### Fase 1: Simple (OPCIÓN 2) - 2-3 horas
1. Agregar `analyze_attack_vectors()` método a `AIService`
2. Config env: `ANALYSIS_MODEL=claude|ollama` + `CLAUDE_API_KEY`
3. Endpoint backend POST `/scans/{id}/analysis/vectors` (sync)
4. Frontend: Botón "Analyze vectors" que hace POST y espera resultado
5. ⚠️ **Limitación**: UI bloqueada durante análisis

### Fase 2: Async (OPCIÓN 3) - 4-5 horas
1. Convertir endpoint a task Celery
2. Polling endpoint `/status/{task_id}`
3. Frontend: Loading indicator + polling
4. Cacheo en Redis 24h
5. Persistencia en columna `scan.attack_vector_analysis`

### Fase 3: Microservicio (OPCIÓN 1) - 6-8 horas
1. Nuevo `ai_analyzer` Docker service
2. FastAPI endpoint `/analyze/vectors`
3. Backend orquesta llamadas vía HTTP o queue
4. Escalable: múltiples instancias del analyzer si es necesario

---

## Proveedores de IA y Configuración

| Provider | Modelo | Costo | Local | Config Env |
|----------|--------|-------|-------|-----------|
| **Claude (Anthropic)** | 3.5 Sonnet | $3/1M tokens | ❌ | `CLAUDE_API_KEY` |
| **OpenAI** | GPT-4o mini | $0.15/1M tokens | ❌ | `OPENAI_API_KEY` |
| **Ollama** | Llama3, Mistral | Free (local) | ✅ | `OLLAMA_HOST` |
| **Groq** | Mixtral | ⚡ Fast, $0.27/1M | ❌ | `GROQ_API_KEY` |

**Recomendación**: Ollama local para desarrollo/testing, Claude para producción (mejor calidad).

---

## Ejemplo: Qué Analizaría

**Input**: Lista de findings ZAP, Nuclei, Nikto
```json
[
  {"tool": "zap", "title": "Missing CSP Header", "severity": "medium"},
  {"tool": "zap", "title": "Missing X-Frame-Options", "severity": "medium"},
  {"tool": "nuclei", "title": "Open S3 Bucket", "severity": "critical"}
]
```

**Output**:
```
ATTACK VECTORS:
1. SUPPLY CHAIN ATTACK (Open S3)
   - Attacker can upload malicious files
   - Impact: RCE, data exfil
   - Probability: HIGH (bucket public, no auth)

2. CLICKJACKING (Missing X-Frame-Options)
   - Attacker embeds site in iframe
   - Impact: Phishing, session hijack
   - Probability: MEDIUM (requires user interaction)

3. XSS (Missing CSP)
   - Attacker injects scripts
   - Impact: Credential theft, defacement
   - Probability: HIGH (depends on input validation)

COMBINED RISK SCORE: 8.5/10 (HIGH)
Recommendation: Fix S3 immediately, add CSP + X-Frame-Options for quick wins.
```
