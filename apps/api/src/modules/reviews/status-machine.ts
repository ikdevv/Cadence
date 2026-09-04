import { ConflictException } from '@nestjs/common';
import type { ReportStatus } from '../../generated/prisma/enums.js';

export type ReportAction = 'SUBMIT' | 'APPROVE' | 'REQUEST_CHANGES';

/**
 * The whole status machine as one table, so the legal moves are readable in a
 * single place instead of scattered across if-statements:
 *
 *   DRAFT --submit--> SUBMITTED --approve--> APPROVED (terminal)
 *                         |  ^
 *        request_changes  |  | resubmit
 *                         v  |
 *                   NEEDS_CORRECTION
 */
export const TRANSITIONS: Record<
  ReportStatus,
  Partial<Record<ReportAction, ReportStatus>>
> = {
  DRAFT: { SUBMIT: 'SUBMITTED' },
  SUBMITTED: { APPROVE: 'APPROVED', REQUEST_CHANGES: 'NEEDS_CORRECTION' },
  NEEDS_CORRECTION: { SUBMIT: 'SUBMITTED' },
  APPROVED: {},
};

export function nextStatus(
  current: ReportStatus,
  action: ReportAction,
): ReportStatus {
  const next = TRANSITIONS[current][action];
  if (!next) {
    throw new ConflictException(
      `Cannot ${action.toLowerCase().replace('_', ' ')} a report in status ${current}`,
    );
  }
  return next;
}
