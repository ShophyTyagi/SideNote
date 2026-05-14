import time
from fastapi import APIRouter
from pydantic import BaseModel, validator
from typing import Optional

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.services.retrieval import retrieve_chunks
from app.services.generation import generate_answer, build_context
from app.config import settings

router = APIRouter()

llm = ChatAnthropic(model="claude-opus-4-5", api_key=settings.anthropic_api_key)


class AgentQARequest(BaseModel):
    question: str
    document_ids: Optional[list[str]] = None
    top_k: Optional[int] = 10

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


def make_tools(document_ids: Optional[list[str]], top_k: int):
    captured = {"citations": [], "answer": None}

    @tool
    def retrieve(query: str) -> str:
        """Retrieve relevant document chunks for a query. Use this first to find context."""
        chunks = retrieve_chunks(query, document_ids, top_k)
        if not chunks:
            return "No relevant chunks found."
        return build_context(chunks)

    @tool
    def answer(query: str, context: str) -> str:
        """Generate a grounded answer given a question and context from retrieved chunks."""
        chunks = retrieve_chunks(query, document_ids, top_k)
        result = generate_answer(query, chunks)
        captured["citations"] = result.get("citations", [])
        captured["answer"] = result.get("answer", "No answer generated.")
        return captured["answer"]

    return [retrieve, answer], captured


PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a document Q&A assistant. Use the retrieve tool to find relevant context, then use the answer tool to produce a grounded response. Always cite your reasoning."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])


@router.post("/agent/qa")
def agent_qa(request: AgentQARequest):
    start = time.time()

    tools, captured = make_tools(request.document_ids, request.top_k)
    agent = create_tool_calling_agent(llm, tools, PROMPT)
    executor = AgentExecutor(agent=agent, tools=tools, return_intermediate_steps=True, verbose=False)

    result = executor.invoke({"input": request.question})
    latency_ms = int((time.time() - start) * 1000)

    steps = []
    for action, observation in result.get("intermediate_steps", []):
        steps.append({
            "tool": action.tool,
            "tool_input": action.tool_input,
            "observation": observation,
        })

    return {
        "answer": captured["answer"] if captured["answer"] is not None else result.get("output"),
        "citations": captured["citations"],
        "tool_calls": steps,
        "metrics": {
            "latency_ms": latency_ms,
            "steps": len(steps),
            "model": "claude-opus-4-5",
        },
    }
