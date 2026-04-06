import os
import shutil
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.ingestion import ingest_document, load_registry, save_registry, get_vector_store

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_SIZE_BYTES = 25 * 1024 * 1024  # 20MB

@router.post("/documents")
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 20MB limit.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = ingest_document(tmp_path, file.filename)
    finally:
        os.unlink(tmp_path)

    return result

@router.get("/documents")
def list_documents():
    registry = load_registry()
    return {"documents": list(registry.values())}

@router.delete("/documents/{document_id}")
def delete_document(document_id: str):
    registry = load_registry()
    if document_id not in registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    vector_store = get_vector_store()
    vector_store.delete(where={"document_id": document_id})

    del registry[document_id]
    save_registry(registry)

    return {"deleted": document_id}