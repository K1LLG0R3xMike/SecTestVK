import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import AnalysisRequest, AnalysisResponse
from analyzer import analyzer

app = FastAPI(
    title="Attack Vector Analyzer",
    description="Analyzes security findings to identify attack vectors using Claude or OpenAI",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "attack_vector_analyzer",
        "claude_available": bool(os.getenv("CLAUDE_API_KEY")),
        "openai_available": bool(os.getenv("OPENAI_API_KEY"))
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_findings(request: AnalysisRequest) -> AnalysisResponse:
    """
    Analyze security findings to identify potential attack vectors.
    
    - **findings**: List of security findings from scan
    - **scan_id**: ID of the scan
    - **provider**: AI provider (claude or openai), defaults to claude
    """
    
    if not request.findings:
        raise HTTPException(status_code=400, detail="No findings provided")
    
    # Check if requested provider is available
    if request.provider == "claude" and not os.getenv("CLAUDE_API_KEY"):
        raise HTTPException(status_code=503, detail="Claude API key not configured")
    
    if request.provider == "openai" and not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    
    try:
        analysis = await analyzer.analyze(
            findings=request.findings,
            scan_id=request.scan_id,
            provider=request.provider
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/providers")
async def get_available_providers():
    """Get list of available AI providers."""
    return {
        "providers": [
            {
                "name": "claude",
                "available": bool(os.getenv("CLAUDE_API_KEY")),
                "model": "claude-3-5-sonnet-20241022"
            },
            {
                "name": "openai",
                "available": bool(os.getenv("OPENAI_API_KEY")),
                "model": "gpt-4o-mini"
            }
        ]
    }
