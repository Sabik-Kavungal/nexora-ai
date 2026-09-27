# Nexora

**AI Knowledge & RAG Platform**

A production-structured, end-to-end Retrieval-Augmented Generation (RAG) assistant featuring multi-format document extraction, dense vector embeddings, pgvector similarity search, streaming answers with verifiable source citations, and a modular AI provider abstraction.

---

## 1. System Architecture Overview

```
                        ┌────────────────────────────────────────────────────────┐
                        │              Browser / Client Interface                │
                        │           React + TypeScript (Vite)                    │
                        │      Tailwind CSS · SSE Streaming · Source Drawer      │
                        └───────────────────────────┬────────────────────────────┘
                                                    │ HTTP / SSE Stream / JWT
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Backend Services Layer                                 │
│                   FastAPI (Python)  /  Express + tsx (Port 3000 Server)                │
├───────────────────┬───────────────────┬───────────────────┬────────────────────────────┤
│   Auth & Security │ Document Pipeline │   RAG Engine      │   AI Provider Abstraction  │
│   · JWT Bearer    │ · PDF (pdf-parse) │ · Vector Search   │   · HuggingFaceProvider    │
│   · bcrypt hash   │ · DOCX (mammoth)  │ · Anti-Injection  │   · Llama-3.1-8B-Instruct  │
│   · Multi-tenant  │ · Chunker+Overlap │ · Context Builder │   · all-MiniLM-L6-v2       │
│   · Data Isolation│ · Text Cleaner    │ · Source Tracker  │   · Strict Error Boundary  │
└───────────────────┴─────────┬─────────┴─────────┬─────────┴──────────────┬─────────────┘
                              │                   │                        │
                              ▼                   ▼                        │
          ┌────────────────────────────────────────────────┐               │
          │         PostgreSQL Database + pgvector         │               │
          ├────────────────────────────────────────────────┤               │
          │  · users                                       │               │
          │  · knowledge_bases                             │               │
          │  · documents                                   │               │
          │  · document_chunks (embedding vector(384))     │               │
          │  · conversations & messages                    │               │
          │  · Cosine Distance Vector Index (<=>)          │               │
          └────────────────────────────────────────────────┘               │
                                                                           │
                                                                           ▼
                                                    ┌────────────────────────────┐
                                                    │ Hugging Face Inference API │
                                                    │ · all-MiniLM-L6-v2 (Embed) │
                                                    │ · Llama-3.1-8B-Instruct    │
                                                    └────────────────────────────┘
```

---

## 2. Core User Journey Flow

1. **User Authentication:** Registration and login issue cryptographically signed JWT tokens with bcrypt-hashed passwords.
2. **Knowledge Base Creation:** Users create isolated knowledge repositories scoped to their account (`user_id`).
3. **Document Ingestion:**
   * Validates file size (up to 15MB) and format (PDF, DOCX, TXT, Markdown).
   * Extracts text preserving page numbers for PDFs and paragraph structures for DOCX.
   * Splits text using a boundary-aware semantic chunker (`CHUNK_SIZE=800`, `CHUNK_OVERLAP=150`).
4. **Vector Embedding & Storage:**
   * Generates dense 384-dimensional embeddings via Hugging Face (`sentence-transformers/all-MiniLM-L6-v2`).
   * Persists chunk metadata and embeddings into PostgreSQL with `pgvector`.
5. **Retrieval-Augmented Chat:**
   * User submits a query in a knowledge base conversation.
   * Generates the query vector embedding.
   * Performs cosine similarity search (`vector_cosine_ops`) filtered strictly by user and knowledge base.
   * Assembles an anti-injection grounded prompt containing top retrieved passages.
   * Streams tokens in real time from `meta-llama/Llama-3.1-8B-Instruct`.
   * Returns verifiable citations with document names, page numbers, and similarity percentages.

---

## 3. Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `AI_PROVIDER` | AI provider implementation | `huggingface` |
| `HF_TOKEN` | Hugging Face Access Token | `hf_...` |
| `HF_GENERATION_MODEL` | LLM text generation model | `meta-llama/Llama-3.1-8B-Instruct` |
| `HF_EMBEDDING_MODEL` | Embedding feature extraction model | `sentence-transformers/all-MiniLM-L6-v2` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgrespassword@localhost:5432/nexora` |
| `JWT_SECRET` | Secret key for JWT signing | `supersecret-jwt-key-production-nexora-2026-secure` |
| `PORT` | Web server port | `3000` |

---

## 4. Running with Docker Compose

Run the entire platform including PostgreSQL (pgvector), FastAPI backend, and Nexora web application:

```bash
docker compose build
docker compose up
```

Services:
* **Nexora Web:** `http://localhost:3000`
* **FastAPI Backend & Swagger Docs:** `http://localhost:8000/docs`
* **PostgreSQL (pgvector):** `localhost:5432`

---

## 5. Health Check Endpoints

* `GET /health` — Verifies system status, database connectivity, and AI provider readiness.
* `GET /api/health` — API router health check.
