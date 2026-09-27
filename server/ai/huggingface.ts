import { AIProvider, GenerationOptions } from './base.js';

export class HuggingFaceProvider implements AIProvider {
  public readonly name = 'huggingface';
  private token: string;
  private model: string;
  private embeddingModel: string;

  constructor(token?: string, model?: string, embeddingModel?: string) {
    this.token = (token || process.env.HF_TOKEN || '').trim();
    this.model = (model || process.env.HF_GENERATION_MODEL || process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct').trim();
    this.embeddingModel = (embeddingModel || process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2').trim();
  }

  public updateConfig(token?: string, model?: string, embeddingModel?: string) {
    if (token !== undefined) this.token = token.trim();
    if (model !== undefined) this.model = model.trim();
    if (embeddingModel !== undefined) this.embeddingModel = embeddingModel.trim();
  }

  private ensureConfigured(): void {
    if (!this.token || this.token.length === 0 || this.token.startsWith('hf_your_')) {
      throw new Error('AI provider is not configured. Add HF_TOKEN to enable AI features.');
    }
  }

  /**
   * Generates a 384-dimensional vector embedding for a single text input.
   */
  async createEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.createEmbeddings([text]);
    return embeddings[0];
  }

  /**
   * Generates embeddings for a batch of text inputs strictly via Hugging Face.
   * Throws an error if AI provider is not configured or if Hugging Face returns an error.
   * NEVER falls back to fake or dummy vector values.
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    this.ensureConfigured();

    if (!texts || texts.length === 0) {
      return [];
    }

    try {
      const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.embeddingModel}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: texts,
          options: { wait_for_model: true },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown network error');
        throw new Error(
          `Hugging Face embedding request failed (${res.status}): ${errText}. Please check the AI provider configuration.`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid embedding response format received from Hugging Face.');
      }

      // HF feature-extraction returns number[][] (mean pooled) or number[][][] (token embeddings)
      return data.map((item: any) => {
        if (Array.isArray(item) && typeof item[0] === 'number') {
          return item;
        }
        if (Array.isArray(item) && Array.isArray(item[0])) {
          // Token level embeddings -> calculate mean pooling
          const dim = item[0].length;
          const pooled = new Array(dim).fill(0);
          for (const tok of item) {
            for (let i = 0; i < dim; i++) {
              pooled[i] += tok[i];
            }
          }
          return pooled.map((v) => v / item.length);
        }
        throw new Error('Unexpected embedding vector structure received from Hugging Face.');
      });
    } catch (err: any) {
      if (err.message && err.message.includes('AI provider is not configured')) {
        throw err;
      }
      console.error('[HuggingFaceProvider] Embedding generation error:', err);
      throw new Error(`AI service unavailable. Please check the AI provider configuration: ${err.message}`);
    }
  }

  /**
   * Generates complete text response from Hugging Face LLM.
   */
  async generateText(prompt: string, systemPrompt?: string, options?: GenerationOptions): Promise<string> {
    let result = '';
    for await (const chunk of this.generateStream(prompt, systemPrompt, options)) {
      result += chunk;
    }
    return result;
  }

  /**
   * Streams response token by token strictly from Hugging Face.
   * Throws an error if AI provider is not configured or if Hugging Face is unreachable.
   * NEVER returns mock, fake, or synthetic fallback answers.
   */
  async *generateStream(prompt: string, systemPrompt?: string, options?: GenerationOptions): AsyncIterable<string> {
    this.ensureConfigured();

    const maxTokens = options?.maxTokens || 1024;
    const temperature = options?.temperature ?? 0.2;

    // 1. First attempt: Hugging Face OpenAI-compatible Chat Completions router
    try {
      const chatUrl = 'https://router.huggingface.co/v1/chat/completions';
      const messages: { role: string; content: string }[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let emittedAny = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  emittedAny = true;
                  yield delta;
                }
              } catch {
                // Ignore incomplete line
              }
            }
          }
        }

        if (emittedAny) {
          return;
        }
      }

      // 2. Secondary endpoint: standard Hugging Face Inference API
      const textUrl = `https://api-inference.huggingface.co/models/${this.model}`;
      const combinedPrompt = systemPrompt
        ? `<system>\n${systemPrompt}\n</system>\n\nUser: ${prompt}\n\nAssistant:`
        : prompt;

      const textRes = await fetch(textUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: combinedPrompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature,
            return_full_text: false,
          },
        }),
      });

      if (textRes.ok) {
        const data = await textRes.json();
        const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
        if (text && typeof text === 'string') {
          yield text;
          return;
        }
      }

      const errorText = await textRes.text().catch(() => 'Inference endpoint error');
      throw new Error(`Inference returned status ${textRes.status}: ${errorText}`);
    } catch (err: any) {
      console.error('[HuggingFaceProvider] Inference error:', err);
      throw new Error(`AI service unavailable. Please check the AI provider configuration: ${err.message}`);
    }
  }
}
