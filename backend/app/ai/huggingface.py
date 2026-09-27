import json
import asyncio
import urllib.request
import urllib.error
from typing import AsyncIterable, List, Optional, Dict, Any
from backend.app.ai.base import AIProvider

class HuggingFaceProvider(AIProvider):
    def __init__(
        self,
        token: Optional[str] = None,
        model: Optional[str] = None,
        embedding_model: Optional[str] = None,
    ):
        self.token = (token or "").strip()
        self.model = (model or "meta-llama/Llama-3.1-8B-Instruct").strip()
        self.embedding_model = (embedding_model or "sentence-transformers/all-MiniLM-L6-v2").strip()

    @property
    def name(self) -> str:
        return "huggingface"

    def _ensure_configured(self) -> None:
        if not self.token or self.token.startswith("hf_your_"):
            raise ValueError("AI provider is not configured. Add HF_TOKEN to enable AI features.")

    async def create_embedding(self, text: str) -> List[float]:
        embeddings = await self.create_embeddings([text])
        return embeddings[0]

    async def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        self._ensure_configured()

        if not texts:
            return []

        try:
            url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.embedding_model}"
            req = urllib.request.Request(
                url,
                data=json.dumps({"inputs": texts, "options": {"wait_for_model": True}}).encode("utf-8"),
                headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=35.0) as res:
                data = json.loads(res.read().decode("utf-8"))
                if isinstance(data, list):
                    output = []
                    for item in data:
                        if isinstance(item, list) and len(item) > 0 and isinstance(item[0], (int, float)):
                            output.append(item)
                        elif isinstance(item, list) and isinstance(item[0], list):
                            dim = len(item[0])
                            pooled = [sum(tok[i] for tok in item) / len(item) for i in range(dim)]
                            output.append(pooled)
                    if len(output) == len(texts):
                        return output
            raise RuntimeError("Invalid embedding response from Hugging Face.")
        except Exception as e:
            if "AI provider is not configured" in str(e):
                raise
            raise RuntimeError(f"AI service unavailable. Please check the AI provider configuration: {e}")

    async def generate_text(
        self, prompt: str, system_prompt: Optional[str] = None, options: Optional[Dict[str, Any]] = None
    ) -> str:
        chunks = []
        async for chunk in self.generate_stream(prompt, system_prompt, options):
            chunks.append(chunk)
        return "".join(chunks)

    async def generate_stream(
        self, prompt: str, system_prompt: Optional[str] = None, options: Optional[Dict[str, Any]] = None
    ) -> AsyncIterable[str]:
        self._ensure_configured()

        max_tokens = (options or {}).get("max_tokens", 1024)
        temperature = (options or {}).get("temperature", 0.2)

        try:
            chat_url = "https://router.huggingface.co/v1/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            req = urllib.request.Request(
                chat_url,
                data=json.dumps({
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stream": False,
                }).encode("utf-8"),
                headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=45.0) as res:
                payload = json.loads(res.read().decode("utf-8"))
                content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content:
                    words = content.split(" ")
                    for i, word in enumerate(words):
                        yield word + (" " if i < len(words) - 1 else "")
                        await asyncio.sleep(0.01)
                    return
            raise RuntimeError("Empty response received from Hugging Face chat completion.")
        except Exception as e:
            if "AI provider is not configured" in str(e):
                raise
            raise RuntimeError(f"AI service unavailable. Please check the AI provider configuration: {e}")
