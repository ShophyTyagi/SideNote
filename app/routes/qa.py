import time
from fastapi import APIRouter
from pydantic import BaseModel, validator
from typing import Optional

from app.services.retrieval import retrieve_chunks
from app.services.generation import generate_answer
from app.services.ingestion import load_registry

router = APIRouter()

class QARequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    top_k: Optional[int] = 10
    use_rag: Optional[bool] = True

    @validator('question')
    def validate_question(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty.')
        if len(v) > 2000:
            raise ValueError('Question too long. Max 2000 characters.')
        return v.strip()

    @validator('top_k')
    def validate_top_k(cls, v):
        if v < 1 or v > 20:
            raise ValueError('top_k must be between 1 and 20.')
        return v

@router.post("/qa")
def qa(request: QARequest):
    start = time.time()

    if request.use_rag:
        chunks = retrieve_chunks(request.question, request.document_ids, request.top_k)
    else:
        chunks = []

    result = generate_answer(request.question, chunks)
    latency_ms = int((time.time() - start) * 1000)

    registry = load_registry()
    sources = [
        registry[doc_id]
        for doc_id in (request.document_ids or [])
        if doc_id in registry
    ]

    return {
        "answer": result.get("answer"),
        "citations": result.get("citations", []),
        "sources": sources,
        "metrics": {
            "latency_ms": latency_ms,
            "retrieved_k": len(chunks),
            "model": "claude-opus-4-5",
        }
    }