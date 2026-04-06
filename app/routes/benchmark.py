import time
import json
import re
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from anthropic import Anthropic
from app.services.retrieval import retrieve_chunks
from app.services.generation import generate_answer, build_context
from app.config import settings

router = APIRouter()
client = Anthropic(api_key=settings.anthropic_api_key)

class BenchmarkRequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    top_k: Optional[int] = 10

def vanilla_answer(question: str) -> dict:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": question}],
    )
    return {"answer": response.content[0].text.strip(), "citations": []}

def judge_groundedness(question: str, rag_answer: str, context: str) -> dict:
    prompt = f"""You are an evaluator. Given a question, a context, and an answer, score whether the answer is grounded in the context.

Question: {question}

Context:
{context}

Answer: {rag_answer}

Score the answer from 0 to 5:
0 = completely unsupported or contradicts context
3 = partially supported
5 = fully supported by context

Respond in this exact JSON format:
{{
  "groundedness_score": <integer 0-5>,
  "explanation": "<one sentence explanation>"
}}

Return JSON only."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # cheap, fast, good enough for judging
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"groundedness_score": -1, "explanation": raw}

@router.post("/benchmark")
def benchmark(request: BenchmarkRequest):
    # RAG answer
    rag_start = time.time()
    chunks = retrieve_chunks(request.question, request.document_ids, request.top_k)
    rag_result = generate_answer(request.question, chunks)
    rag_latency = int((time.time() - rag_start) * 1000)

    # Vanilla answer
    vanilla_start = time.time()
    vanilla_result = vanilla_answer(request.question)
    vanilla_latency = int((time.time() - vanilla_start) * 1000)

    # Judge
    context = build_context(chunks)
    evaluation = judge_groundedness(request.question, rag_result.get("answer", ""), context)

    return {
        "rag": {
            "answer": rag_result.get("answer"),
            "citations": rag_result.get("citations", []),
            "metrics": {
                "latency_ms": rag_latency,
                "retrieved_k": len(chunks),
                "model": "claude-opus-4-5",
            }
        },
        "vanilla": {
            "answer": vanilla_result["answer"],
            "citations": [],
            "metrics": {
                "latency_ms": vanilla_latency,
                "retrieved_k": 0,
                "model": "claude-opus-4-5",
            }
        },
        "evaluation": evaluation
    }