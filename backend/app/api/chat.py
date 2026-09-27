import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from backend.app.db.session import get_db
from backend.app.models.models import Conversation, Message, KnowledgeBase, User
from backend.app.schemas.schemas import ChatRequest, ConversationResponse, MessageResponse
from backend.app.api.deps import get_current_user
from backend.app.rag.pipeline import RAGPipeline

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/")
async def chat_rag_stream(
    chat_req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify KB ownership
    kb_stmt = select(KnowledgeBase).where(
        and_(KnowledgeBase.id == chat_req.knowledge_base_id, KnowledgeBase.user_id == current_user.id)
    )
    kb_result = await db.execute(kb_stmt)
    if not kb_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Knowledge base not found or access denied")

    conv_id = chat_req.conversation_id
    if not conv_id:
        conv = Conversation(
            knowledge_base_id=chat_req.knowledge_base_id,
            user_id=current_user.id,
            title=chat_req.message[:36] + ("..." if len(chat_req.message) > 36 else ""),
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conv_id = conv.id

    # Store user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=chat_req.message,
    )
    db.add(user_msg)
    await db.commit()

    rag_result = await RAGPipeline.query(
        db=db,
        user_id=str(current_user.id),
        knowledge_base_id=str(chat_req.knowledge_base_id),
        question=chat_req.message,
    )

    async def event_generator():
        yield f"event: conversation\ndata: {json.dumps({'conversation_id': str(conv_id)})}\n\n"
        yield f"event: sources\ndata: {json.dumps(rag_result['sources'])}\n\n"

        full_answer = []
        async for token in rag_result["stream"]:
            full_answer.append(token)
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

        # Save assistant message
        assistant_text = "".join(full_answer)
        assistant_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=assistant_text,
            sources=rag_result["sources"],
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        yield f"event: done\ndata: {json.dumps({'message_id': str(assistant_msg.id), 'sources': rag_result['sources']})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
