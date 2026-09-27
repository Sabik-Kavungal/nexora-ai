import os
from typing import List

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    class Settings(BaseSettings):
        PROJECT_NAME: str = "Nexora Backend"
        API_V1_STR: str = "/api"
        DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/nexora"
        JWT_SECRET: str = "nexora-super-secret-jwt-key-production-32chars"
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
        AI_PROVIDER: str = "huggingface"
        HF_TOKEN: str = os.getenv("HF_TOKEN", "")
        HF_GENERATION_MODEL: str = os.getenv("HF_GENERATION_MODEL", os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct"))
        HF_MODEL: str = os.getenv("HF_MODEL", os.getenv("HF_GENERATION_MODEL", "meta-llama/Llama-3.1-8B-Instruct"))
        HF_EMBEDDING_MODEL: str = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
        CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
        RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "4"))
        RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.35"))
        MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "1024"))
        CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
        model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    settings = Settings()
except ImportError:
    class StandaloneSettings:
        PROJECT_NAME: str = "Nexora Backend"
        API_V1_STR: str = "/api"
        DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/nexora")
        JWT_SECRET: str = os.getenv("JWT_SECRET", "nexora-super-secret-jwt-key-production-32chars")
        JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
        AI_PROVIDER: str = os.getenv("AI_PROVIDER", "huggingface")
        HF_TOKEN: str = os.getenv("HF_TOKEN", "")
        HF_GENERATION_MODEL: str = os.getenv("HF_GENERATION_MODEL", os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct"))
        HF_MODEL: str = os.getenv("HF_MODEL", os.getenv("HF_GENERATION_MODEL", "meta-llama/Llama-3.1-8B-Instruct"))
        HF_EMBEDDING_MODEL: str = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
        CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
        RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "4"))
        RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.35"))
        MAX_OUTPUT_TOKENS: int = int(os.getenv("MAX_OUTPUT_TOKENS", "1024"))
        CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    settings = StandaloneSettings()
