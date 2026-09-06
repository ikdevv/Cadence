import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, GenerateTextInput } from './ai-provider.interface.js';

/** OpenAI-compatible chat-completions endpoint for Hugging Face Inference Providers. */
const HF_CHAT_COMPLETIONS_URL = 'https://router.huggingface.co/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 700;

/**
 * Carries an HTTP status when the failure came back from Hugging Face itself
 * (e.g. 429) so the caller can decide whether to forward it, without this
 * class knowing anything about NestJS exceptions.
 */
export class HuggingFaceProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'HuggingFaceProviderError';
  }
}

interface HfChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

@Injectable()
export class HuggingFaceProvider implements AIProvider {
  constructor(private readonly config: ConfigService) {}

  async generateText({ systemPrompt, userPrompt }: GenerateTextInput): Promise<string> {
    const apiKey = this.config.get<string>('HUGGINGFACE_API_KEY');
    const model = this.config.get<string>('HUGGINGFACE_MODEL');
    if (!apiKey || !model) {
      throw new HuggingFaceProviderError('The AI assistant is not configured on this server.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(HF_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new HuggingFaceProviderError(
        timedOut ? 'The AI provider timed out.' : 'Could not reach the AI provider.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // Kept for the server log only — the caller replaces this with a generic
      // message before anything reaches the browser.
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new HuggingFaceProviderError(
        `The AI provider returned an error (${response.status}). ${detail}`.trim(),
        response.status,
      );
    }

    const body = (await response.json().catch(() => null)) as HfChatCompletionResponse | null;
    const content = body?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new HuggingFaceProviderError('The AI provider returned an empty response.');
    }

    return content;
  }
}
