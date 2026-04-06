import logging
from fastapi import FastAPI
from app.routes import documents, qa, benchmark, redteam

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

app = FastAPI(
    title="SideNote",
    description="Document Q&A API with RAG, citations, and grounding evaluation.",
    version="0.1.0",
)

app.include_router(documents.router, prefix="/v1")
app.include_router(qa.router, prefix="/v1")
app.include_router(benchmark.router, prefix="/v1")
app.include_router(redteam.router, prefix="/v1") 

@app.get("/health")
def health():
    try:
        from app.services.ingestion import get_vector_store
        vs = get_vector_store()
        vs.get()
        chroma_status = "ok"
    except Exception as e:
        chroma_status = f"error: {str(e)}"

    return {
        "status": "ok" if chroma_status == "ok" else "degraded",
        "chroma": chroma_status
    }