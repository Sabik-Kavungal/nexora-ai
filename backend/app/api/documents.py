import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from backend.app.db.session import get_db
from backend.app.models.models import Document, DocumentChunk, KnowledgeBase, User
from backend.app.schemas.schemas import DocumentResponse, ChunkResponse
from backend.app.api.deps import get_current_user
from backend.app.documents.extractor import TextExtractor
from backend.app.documents.chunker import DocumentChunker
from backend.app.ai.factory import get_ai_provider
from backend.app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/kb/{kb_id}", response_model=List[DocumentResponse])
async def list_documents_by_kb(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(
        and_(Document.knowledge_base_id == kb_id, Document.user_id == current_user.id)
    ).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    knowledge_base_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify KB ownership
    kb_stmt = select(KnowledgeBase).where(
        and_(KnowledgeBase.id == knowledge_base_id, KnowledgeBase.user_id == current_user.id)
    )
    kb_result = await db.execute(kb_stmt)
    if not kb_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target knowledge base not found")

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 15MB limit")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["pdf", "docx", "txt", "md", "markdown"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    doc = Document(
        knowledge_base_id=knowledge_base_id,
        user_id=current_user.id,
        filename=file.filename,
        file_type=file.content_type or f"application/{ext}",
        file_size=len(content),
        status="PROCESSING",
        chunk_count=0,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        _, pages = TextExtractor.extract(content, file.filename)
        chunks_data = DocumentChunker.chunk(pages, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

        if not chunks_data:
            raise ValueError("No text chunks could be extracted from document.")

        provider = get_ai_provider()
        embeddings = await provider.create_embeddings([c["content"] for c in chunks_data])

        for c, emb in zip(chunks_data, embeddings):
            chunk_row = DocumentChunk(
                document_id=doc.id,
                knowledge_base_id=knowledge_base_id,
                user_id=current_user.id,
                chunk_index=c["chunk_index"],
                content=c["content"],
                page_number=c["page_number"],
                embedding=emb,
                chunk_metadata=c["metadata"],
            )
            db.add(chunk_row)

        doc.status = "READY"
        doc.chunk_count = len(chunks_data)
        await db.commit()
        await db.refresh(doc)
        return doc
    except Exception as e:
        doc.status = "FAILED"
        doc.error_message = str(e)
        await db.commit()
        await db.refresh(doc)
        raise HTTPException(status_code=422, detail=f"Document processing failed: {str(e)}")

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(
        and_(Document.id == doc_id, Document.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    await db.delete(doc)
    await db.commit()
    return None
