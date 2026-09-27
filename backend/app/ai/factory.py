from backend.app.ai.base import AIProvider
from backend.app.ai.huggingface import HuggingFaceProvider
from backend.app.core.config import settings

_provider_instance: AIProvider = None

def get_ai_provider() -> AIProvider:
    global _provider_instance
    provider_type = settings.AI_PROVIDER.lower()

    if provider_type == "huggingface":
        if _provider_instance is None:
            _provider_instance = HuggingFaceProvider(
                token=settings.HF_TOKEN,
                model=settings.HF_MODEL,
                embedding_model=settings.HF_EMBEDDING_MODEL,
            )
        return _provider_instance
    elif provider_type == "openai":
        raise NotImplementedError("OpenAI provider extension point. Please configure AI_PROVIDER=huggingface.")
    elif provider_type == "anthropic":
        raise NotImplementedError("Anthropic provider extension point. Please configure AI_PROVIDER=huggingface.")
    else:
        if _provider_instance is None:
            _provider_instance = HuggingFaceProvider(
                token=settings.HF_TOKEN,
                model=settings.HF_MODEL,
                embedding_model=settings.HF_EMBEDDING_MODEL,
            )
        return _provider_instance
