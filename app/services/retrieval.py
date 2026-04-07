from app.services.ingestion import get_vector_store

def retrieve_chunks(question: str, document_ids: list = None, top_k: int = 10) -> list:
    vector_store = get_vector_store()

    if document_ids:
        results = vector_store.similarity_search(
            question,
            k=top_k,
            filter={"document_id": {"$in": document_ids}},
        )
    else:
        results = vector_store.similarity_search(
            question,
            k=top_k,
        )

    return results