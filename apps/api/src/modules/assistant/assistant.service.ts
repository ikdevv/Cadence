import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AI_PROVIDER, type AIProvider } from './ai/ai-provider.interface.js';
import { HuggingFaceProviderError } from './ai/huggingface.provider.js';
import { AssistantContextService } from './assistant-context.service.js';
import { AssistantRateLimitService } from './assistant-rate-limit.service.js';
import type { ReportChatDto } from './dto/report-chat.dto.js';
import { buildUserPrompt, REPORT_ASSISTANT_SYSTEM_PROMPT } from './prompts/report-assistant.prompt.js';

const NO_DATA_MESSAGE = "There isn't enough report data for this period to provide an analysis.";
const GENERIC_FAILURE_MESSAGE = "I couldn't analyze this report right now. Please try again.";
const RATE_LIMIT_MESSAGE = 'Too many questions in a short time. Please wait a few minutes and try again.';
const PROVIDER_BUSY_MESSAGE = 'The AI assistant is receiving too many requests right now. Please try again shortly.';

/** Only the last few turns cross the wire — enough for a follow-up question, not a transcript to grow forever. */
const MAX_HISTORY_MESSAGES = 8;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly context: AssistantContextService,
    private readonly rateLimit: AssistantRateLimitService,
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
  ) {}

  async chat(userId: string, dto: ReportChatDto): Promise<{ answer: string }> {
    if (!this.rateLimit.consume(userId)) {
      throw new HttpException(RATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const context = await this.context.build(dto.filters ?? {});

    // Never ask the model to analyze nothing — an empty context is answered
    // deterministically, with no Hugging Face call.
    if (context.empty) {
      return { answer: NO_DATA_MESSAGE };
    }

    const history = (dto.history ?? []).slice(-MAX_HISTORY_MESSAGES);
    const userPrompt = buildUserPrompt({
      contextJson: JSON.stringify(context),
      history,
      question: dto.question.trim(),
    });

    try {
      const answer = await this.ai.generateText({
        systemPrompt: REPORT_ASSISTANT_SYSTEM_PROMPT,
        userPrompt,
      });
      return { answer };
    } catch (error) {
      // The client only ever sees a generic message, so the real cause — a
      // bad token, a wrong model id, a timeout — has to be findable here or
      // it is lost entirely.
      const detail = error instanceof Error ? error.message : String(error);
      const status = error instanceof HuggingFaceProviderError ? error.status : undefined;
      this.logger.error(
        `AI provider call failed${status ? ` (upstream status ${status})` : ''}: ${detail}`,
      );

      if (error instanceof HuggingFaceProviderError && error.status === 429) {
        throw new HttpException(PROVIDER_BUSY_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
      }
      // Never let a provider error message, timeout detail, or stack trace reach the client.
      throw new ServiceUnavailableException(GENERIC_FAILURE_MESSAGE);
    }
  }
}
