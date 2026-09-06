import { Injectable } from '@nestjs/common';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;

/**
 * A fixed per-user sliding window, in memory. Good enough for a single
 * instance and one external, metered call per question — not a general
 * rate limiter, so it doesn't pull in a new dependency for one endpoint.
 * Resets on process restart and does not coordinate across instances.
 */
@Injectable()
export class AssistantRateLimitService {
  private readonly hits = new Map<string, number[]>();

  /** Returns false, without recording a hit, once the caller is over the limit. */
  consume(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recent = (this.hits.get(userId) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      this.hits.set(userId, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(userId, recent);
    return true;
  }
}
