from backend.app.documents.chunker import DocumentChunker

def test_clean_text():
    raw = "Hello   world!\r\n\r\n\x00This is  a test.\n\n\n\nNext."
    cleaned = DocumentChunker.clean_text(raw)
    assert "\x00" not in cleaned
    assert "\r\n" not in cleaned
    assert "Hello world!" in cleaned
    assert "\n\n" in cleaned

def test_chunking_size_and_overlap():
    text = (
        "Artificial Intelligence is transforming enterprise knowledge management. "
        "Retrieval-Augmented Generation (RAG) combines dense vector search with generative language models. "
        "By retrieving semantically relevant document chunks, systems can answer user queries accurately. "
        "This minimizes hallucination and provides verifiable source citations."
    )
    pages = [{"page_number": 1, "text": text}]
    chunks = DocumentChunker.chunk(pages, chunk_size=120, chunk_overlap=30)
    
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk["content"]) > 0
        assert chunk["page_number"] == 1
        assert "chunk_index" in chunk
