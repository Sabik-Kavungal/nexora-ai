import { AIProvider } from './base.js';
import { HuggingFaceProvider } from './huggingface.js';
import { db } from '../db.js';

let hfInstance: HuggingFaceProvider | null = null;

export function getAIProvider(providerName?: string): AIProvider {
  const settings = db.getSettings();
  const provider = (providerName || settings.ai_provider || 'huggingface').toLowerCase();

  switch (provider) {
    case 'huggingface': {
      if (!hfInstance) {
        hfInstance = new HuggingFaceProvider(
          settings.hf_token,
          settings.hf_model,
          settings.hf_embedding_model
        );
      } else {
        hfInstance.updateConfig(
          settings.hf_token,
          settings.hf_model,
          settings.hf_embedding_model
        );
      }
      return hfInstance;
    }

    case 'openai':
      // Clear architectural extension point for OpenAI (Section 4 & 49)
      throw new Error(
        'OpenAI provider is reserved for future extension. Please set AI_PROVIDER=huggingface.'
      );

    case 'anthropic':
      // Clear architectural extension point for Anthropic (Section 4 & 49)
      throw new Error(
        'Anthropic provider is reserved for future extension. Please set AI_PROVIDER=huggingface.'
      );

    default:
      if (!hfInstance) {
        hfInstance = new HuggingFaceProvider(
          settings.hf_token,
          settings.hf_model,
          settings.hf_embedding_model
        );
      }
      return hfInstance;
  }
}
