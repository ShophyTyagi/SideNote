import json
import re
from anthropic import Anthropic
from app.config import settings
import logging
logger = logging.getLogger(__name__)

client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are a document analysis assistant. 
Answer questions strictly based on the provided context chunks.
If the context does not contain enough information to answer, respond with exactly:
"I don't know based on the provided documents."

Always respond in this exact JSON format:
{
  "answer": "your answer here",
  "citations": [
    {
      "chunk_id": "chunk identifier",
      "snippet": "brief quote from the chunk supporting your answer"
    }
  ]
}

Do not include anything outside the JSON."""

def build_context(chunks: list) -> str:
    parts = []
    for i, chunk in enumerate(chunks):
        parts.append(f"[CHUNK {i}] (source: {chunk.metadata.get('source')}, page: {chunk.metadata.get('page', '?')})\n{chunk.page_content}")
    return "\n\n".join(parts)

def generate_answer(question: str, chunks: list) -> dict:
    context = build_context(chunks)

    user_message = f"""Context:
{context}

Question: {question}

Answer strictly from the context above. Return JSON only."""

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if Claude added them
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {
            "answer": raw,
            "citations": []
        }

    logger.info(f"Generating answer for question: {question[:60]}")

    return parsed