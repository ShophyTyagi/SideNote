import time
from fastapi import APIRouter
from pydantic import BaseModel
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


def make_tools(document_ids: Optional[list[str]], top_k: int):
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
        return result.get("answer", "No answer generated.")

    return [retrieve, answer]


PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a document Q&A assistant. Use the retrieve tool to find relevant context, then use the answer tool to produce a grounded response. Always cite your reasoning."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])


@router.post("/agent/qa")
def agent_qa(request: AgentQARequest):
    start = time.time()

    tools = make_tools(request.document_ids, request.top_k)
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
        "answer": result.get("output"),
        "tool_calls": steps,
        "metrics": {
            "latency_ms": latency_ms,
            "steps": len(steps),
            "model": "claude-opus-4-5",
        },
    }
