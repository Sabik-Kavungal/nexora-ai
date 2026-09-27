from abc import ABC, abstractmethod
from typing import AsyncIterable, List, Optional, Dict, Any

class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier."""
        pass

    @abstractmethod
    async def generate_text(
        self, prompt: str, system_prompt: Optional[str] = None, options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate single complete text response."""
        pass

    @abstractmethod
    def generate_stream(
        self, prompt: str, system_prompt: Optional[str] = None, options: Optional[Dict[str, Any]] = None
    ) -> AsyncIterable[str]:
        """Stream generated text tokens asynchronously."""
        pass

    @abstractmethod
    async def create_embedding(self, text: str) -> List[float]:
        """Generate dense vector embedding for single text."""
        pass

    @abstractmethod
    async def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate dense vector embeddings for batch of texts."""
        pass
