/** DI token — an interface has no runtime identity, so injection goes through this symbol. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface GenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * The only surface the report assistant has onto an LLM. Keeping it this small
 * is what makes the Hugging Face dependency swappable — nothing outside
 * huggingface.provider.ts knows which model or vendor answered the question.
 */
export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<string>;
}
