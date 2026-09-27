export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface AIProvider {
  readonly name: string;

  /**
   * Generates a single text response.
   */
  generateText(prompt: string, systemPrompt?: string, options?: GenerationOptions): Promise<string>;

  /**
   * Streams chunks of generated text as they become available.
   */
  generateStream(prompt: string, systemPrompt?: string, options?: GenerationOptions): AsyncIterable<string>;

  /**
   * Generates a dense vector embedding for a single text input.
   */
  createEmbedding(text: string): Promise<number[]>;

  /**
   * Generates dense vector embeddings for a batch of text inputs.
   */
  createEmbeddings(texts: string[]): Promise<number[][]>;
}
