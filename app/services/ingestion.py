import uuid
import json
import os
from datetime import datetime
import logging
logger = logging.getLogger(__name__)

from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

from app.config import settings

DOCUMENTS_REGISTRY = "./app/data/documents.json"

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vector_store():
    return Chroma(
        persist_directory=settings.chroma_persist_dir,
        embedding_function=embeddings,
    )

def load_registry() -> dict:
    if not os.path.exists(DOCUMENTS_REGISTRY):
        return {}
    with open(DOCUMENTS_REGISTRY, "r") as f:
        return json.load(f)

def save_registry(registry: dict):
    with open(DOCUMENTS_REGISTRY, "w") as f:
        json.dump(registry, f, indent=2)

def ingest_document(file_path: str, filename: str) -> dict:
    document_id = str(uuid.uuid4())

    # 1. Load
    loader = PyMuPDFLoader(file_path)
    pages = loader.load()

    # 2. Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
    )
    chunks = splitter.split_documents(pages)

    # 3. Attach metadata to each chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "document_id": document_id,
            "source": filename,
            "chunk_index": i,
            "created_at": datetime.utcnow().isoformat(),
        })

    # 4. Embed + store in Chroma
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)

    # 5. Update registry
    registry = load_registry()
    registry[document_id] = {
        "document_id": document_id,
        "source": filename,
        "num_chunks": len(chunks),
        "created_at": datetime.utcnow().isoformat(),
    }
    save_registry(registry)

    logger.info(f"Ingested document_id={document_id} source={filename} chunks={len(chunks)}")

    return {
        "document_id": document_id,
        "num_chunks": len(chunks),
        "metadata": registry[document_id],
    }