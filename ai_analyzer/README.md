# AI Analyzer Service

Servicio FastAPI independiente que analiza security findings para identificar vectores de ataque potenciales usando Claude o OpenAI.

## Estructura

```
ai_analyzer/
├── Dockerfile          # Contenedor del servicio
├── requirements.txt    # Dependencias Python
├── main.py            # FastAPI app principal
├── models.py          # Pydantic schemas
├── analyzer.py        # Lógica de análisis
└── README.md          # Este archivo
```

## Características

- ✅ Análisis con Claude 3.5 Sonnet
- ✅ Análisis con OpenAI GPT-4o-mini
- ✅ Parsing inteligente de respuestas LLM
- ✅ Extracción automática de vectores de ataque
- ✅ Cálculo de risk score (1-10)
- ✅ Health check endpoint
- ✅ Provider switch dinámico

## Endpoints

### `GET /health`

Health check del servicio.

```bash
curl http://localhost:8001/health
```

### `POST /analyze`

Analiza un conjunto de findings.

**Request:**
```json
{
  "findings": [
    {
      "title": "Missing CSP Header",
      "description": "Content-Security-Policy header not set",
      "severity": "medium",
      "tool": "zap",
      "evidence": "/index.html 200 OK"
    }
  ],
  "scan_id": 9,
  "provider": "claude"
}
```

**Response:**
```json
{
  "scan_id": 9,
  "provider": "claude",
  "attack_vectors": [
    {
      "name": "XSS via Missing CSP",
      "description": "Attacker injects malicious scripts",
      "probability": "HIGH",
      "impact": "High"
    }
  ],
  "risk_score": 7.5,
  "summary": "Target needs CSP configuration",
  "recommendations": ["Add CSP header"],
  "combined_risk": "HIGH"
}
```

### `GET /providers`

Lista proveedores disponibles.

```bash
curl http://localhost:8001/providers
```

## Desarrollo

### Instalar dependencias (local)

```bash
pip install -r requirements.txt
```

### Run local

```bash
uvicorn main:app --reload --port 8001
```

### Test endpoints

```bash
# Health
curl http://localhost:8001/health

# Analyze
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [{"title": "Test", "description": "Test", "severity": "medium", "tool": "test", "evidence": ""}],
    "scan_id": 1,
    "provider": "claude"
  }'
```

## Configuración

Las API keys se configuran vía variables de entorno en `.env`:

```bash
CLAUDE_API_KEY=sk-ant-v0-xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
```

## Deployment

### Con docker-compose

```bash
docker-compose up -d ai_analyzer
```

### Build manual

```bash
docker build -t sectestvk-ai-analyzer ./ai_analyzer
docker run -p 8001:8001 \
  -e CLAUDE_API_KEY=$CLAUDE_API_KEY \
  sectestvk-ai-analyzer
```

## Performance

- **Latencia típica**: 3-10 segundos (API call)
- **Timeout**: 120 segundos (configurable)
- **Max findings por análisis**: Sin límite teórico (recomendado < 100)
- **Costo estimado**: 
  - Claude: ~$0.003 por análisis
  - OpenAI: ~$0.0005 por análisis
