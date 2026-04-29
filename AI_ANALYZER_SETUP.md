# Attack Vector Analysis Service - Setup Guide

## Overview

El servicio `ai_analyzer` es un microservicio independiente que analiza security findings para identificar vectores de ataque potenciales usando Claude o OpenAI.

## Architecture

```
Frontend
   ↓ POST /scans/{id}/analyze/vectors
Backend (FastAPI)
   ↓ Create Celery task
Worker (Celery)
   ↓ Call HTTP endpoint
AI Analyzer Service (FastAPI)
   ├→ Claude 3.5 Sonnet API
   └→ OpenAI GPT-4o-mini API
```

## Setup

### 1. Configurar API Keys

Edita `.env` con tus credenciales:

```bash
# Para Claude API (recomendado)
CLAUDE_API_KEY=sk-ant-v0-xxxxxxxxxxxxxxxxxxxxx

# Para OpenAI API (alternativo)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Provider por defecto
ANALYSIS_PROVIDER=claude
```

**Cómo obtener las claves:**
- **Claude**: https://console.anthropic.com/keys
- **OpenAI**: https://platform.openai.com/api-keys

### 2. Levantar los servicios

```bash
# Con el nuevo servicio AI Analyzer activado
docker-compose up -d

# Verificar que ai_analyzer está saludable
curl http://localhost:8001/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "service": "attack_vector_analyzer",
  "claude_available": true,
  "openai_available": false
}
```

## API Endpoints

### POST `/scans/{scan_id}/analyze/vectors`

Inicia un análisis asincrónico de vectores de ataque para un scan.

**Request:**
```bash
curl -X POST http://localhost:8000/scans/9/analyze/vectors?provider=claude
```

**Response:**
```json
{
  "status": "queued",
  "scan_id": 9,
  "task_id": "8c4f0d7b-4c3c-4a2e-8b1f-6d5e3c2a1b0f",
  "message": "Analysis queued with claude provider"
}
```

### GET `/scans/{scan_id}/analyze/vectors/status/{task_id}`

Obtiene el estado del análisis (polling).

**Request:**
```bash
curl http://localhost:8000/scans/9/analyze/vectors/status/8c4f0d7b-4c3c-4a2e-8b1f-6d5e3c2a1b0f
```

**Response (En progreso):**
```json
{
  "status": "pending",
  "scan_id": 9,
  "message": "Analysis in progress..."
}
```

**Response (Completado):**
```json
{
  "status": "completed",
  "scan_id": 9,
  "analysis": {
    "scan_id": 9,
    "provider": "claude",
    "attack_vectors": [
      {
        "name": "Clickjacking via Missing X-Frame-Options",
        "description": "Attacker embeds site in iframe for social engineering",
        "probability": "HIGH",
        "impact": "Medium"
      },
      {
        "name": "XSS via Missing CSP Header",
        "description": "Attacker injects malicious scripts for credential theft",
        "probability": "HIGH",
        "impact": "High"
      }
    ],
    "risk_score": 7.5,
    "summary": "Target has moderate security posture with several header misconfigurations",
    "recommendations": [
      "Add X-Frame-Options: DENY header",
      "Implement Content-Security-Policy header",
      "Enable HSTS"
    ],
    "combined_risk": "HIGH"
  }
}
```

### GET `/scans/{scan_id}/analyze/vectors`

Obtiene el análisis cacheado (sin polling).

**Request:**
```bash
curl http://localhost:8000/scans/9/analyze/vectors
```

**Response:**
```json
{
  "status": "available",
  "scan_id": 9,
  "analysis": { ... }
}
```

## AI Providers Comparison

| Aspecto | Claude | OpenAI |
|---------|--------|--------|
| **Modelo** | Claude 3.5 Sonnet | GPT-4o-mini |
| **Costo** | $3/1M input tokens | $0.15/1M input tokens |
| **Velocidad** | 3-10s | 3-10s |
| **Contexto** | 200K tokens | 128K tokens |
| **Recomendación** | ⭐⭐⭐ Mejor calidad | ⭐⭐ Más barato |

## Workflow Completo (Frontend)

### 1. Usuario ve Findings

En la página `/findings`, después de completar un scan.

### 2. Usuario Cliquea "Analyze Attack Vectors"

```jsx
<button onClick={() => startAnalysis(scanId)}>
  Analyze Attack Vectors
</button>
```

### 3. UI Envía POST

```javascript
const response = await fetch(`/api/scans/${scanId}/analyze/vectors`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
const taskId = data.task_id;
```

### 4. Polling para Resultados

```javascript
const pollAnalysis = async (scanId, taskId) => {
  const interval = setInterval(async () => {
    const response = await fetch(
      `/api/scans/${scanId}/analyze/vectors/status/${taskId}`
    );
    const data = await response.json();
    
    if (data.status === 'completed') {
      clearInterval(interval);
      displayAnalysis(data.analysis);
    }
  }, 3000); // Polling cada 3 segundos
};
```

### 5. Mostrar Resultados

```jsx
<div className="attack-vectors">
  <h3>Attack Vectors Identified</h3>
  <ul>
    {analysis.attack_vectors.map(v => (
      <li key={v.name}>
        <strong>{v.name}</strong> (Probability: {v.probability})
        <p>{v.description}</p>
      </li>
    ))}
  </ul>
  <p>Risk Score: {analysis.risk_score}/10</p>
</div>
```

## Troubleshooting

### Error: "Analyzer service unreachable"

Verifica que el contenedor está corriendo:
```bash
docker ps | grep ai_analyzer
```

Si no está, inicia:
```bash
docker-compose up -d ai_analyzer
```

### Error: "API key not configured"

Comprueba `.env`:
```bash
grep CLAUDE_API_KEY .env
grep OPENAI_API_KEY .env
```

Si están vacíos, añade tus claves y reinicia:
```bash
docker-compose up -d --build ai_analyzer backend worker
```

### Timeout (> 120s)

El análisis tardó demasiado. Posibles causas:
- Muchos findings (>100)
- Rate limit de la API

Solución: Aumenta timeout en `workers/tasks/scan_tasks.py` línea ~700 (asyncio timeout).

### Resultados vacíos

Verifica que hay findings en el scan:
```bash
curl http://localhost:8000/scans/9 | grep findings
```

Si está vacío, ejecuta el scan primero.

## Próximas mejoras

- [ ] WebSocket en lugar de polling (actualizaciones en tiempo real)
- [ ] Cacheo en Redis por 24h para reutilizar análisis
- [ ] Dashboard de analytics (tendencias de vectores de ataque)
- [ ] Integración con Slack/Email para notificaciones
- [ ] Escalado horizontal (múltiples instancias de analyzer)
