import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AI_PROVIDER } from './ai/ai-provider.interface.js';
import { HuggingFaceProviderError } from './ai/huggingface.provider.js';
import { AssistantContextService } from './assistant-context.service.js';
import { AssistantRateLimitService } from './assistant-rate-limit.service.js';
import { AssistantService } from './assistant.service.js';

describe('AssistantService', () => {
  let service: AssistantService;
  let context: { build: ReturnType<typeof vi.fn> };
  let rateLimit: { consume: ReturnType<typeof vi.fn> };
  let ai: { generateText: ReturnType<typeof vi.fn> };

  const NON_EMPTY_CONTEXT = {
    empty: false,
    dateRange: { start: '2026-08-10', end: '2026-08-17' },
    filters: { member: null, project: null, status: null },
    reports: [],
  };

  beforeEach(async () => {
    context = { build: vi.fn().mockResolvedValue(NON_EMPTY_CONTEXT) };
    rateLimit = { consume: vi.fn().mockReturnValue(true) };
    ai = { generateText: vi.fn().mockResolvedValue('The team completed 4 tasks this week.') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: AssistantContextService, useValue: context },
        { provide: AssistantRateLimitService, useValue: rateLimit },
        { provide: AI_PROVIDER, useValue: ai },
      ],
    }).compile();

    service = module.get(AssistantService);
  });

  it('returns the provider answer for a normal question', async () => {
    const result = await service.chat('user-1', { question: 'What did the team complete?' });

    expect(result).toEqual({ answer: 'The team completed 4 tasks this week.' });
    expect(ai.generateText).toHaveBeenCalledTimes(1);
    const call = ai.generateText.mock.calls[0]![0];
    expect(call.systemPrompt).toContain('read-only');
    expect(call.userPrompt).toContain('CURRENT QUESTION FROM THE MANAGER');
  });

  it('never calls the provider when there is no report data for the period', async () => {
    context.build.mockResolvedValue({ empty: true, dateRange: { start: 'x', end: 'y' }, filters: {} });

    const result = await service.chat('user-1', { question: 'What happened?' });

    expect(result.answer).toMatch(/isn't enough report data/i);
    expect(ai.generateText).not.toHaveBeenCalled();
  });

  it('rejects with 429 once the per-user rate limit is exhausted, without building context', async () => {
    rateLimit.consume.mockReturnValue(false);

    const error = await service.chat('user-1', { question: 'Anything?' }).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(429);
    expect(context.build).not.toHaveBeenCalled();
  });

  it('turns a provider failure into a friendly 503, hiding the real error', async () => {
    ai.generateText.mockRejectedValue(new HuggingFaceProviderError('boom from upstream'));

    const error = await service.chat('user-1', { question: 'Anything?' }).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toContain('boom from upstream');
  });

  it('maps an upstream 429 to our own 429 rather than a generic 503', async () => {
    ai.generateText.mockRejectedValue(new HuggingFaceProviderError('rate limited', 429));

    const error = await service.chat('user-1', { question: 'Anything?' }).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(429);
  });

  it('handles an empty provider response as a failure, not a blank answer', async () => {
    ai.generateText.mockRejectedValue(new HuggingFaceProviderError('The AI provider returned an empty response.'));

    const error = await service.chat('user-1', { question: 'Anything?' }).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
  });
});
