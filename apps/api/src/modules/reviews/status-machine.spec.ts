import { ConflictException } from '@nestjs/common';
import type { ReportStatus } from '../../generated/prisma/enums.js';
import { nextStatus, type ReportAction } from './status-machine.js';

const legal: [ReportStatus, ReportAction, ReportStatus][] = [
  ['DRAFT', 'SUBMIT', 'SUBMITTED'],
  ['SUBMITTED', 'APPROVE', 'APPROVED'],
  ['SUBMITTED', 'REQUEST_CHANGES', 'NEEDS_CORRECTION'],
  ['NEEDS_CORRECTION', 'SUBMIT', 'SUBMITTED'],
];

const illegal: [ReportStatus, ReportAction][] = [
  ['DRAFT', 'APPROVE'],
  ['DRAFT', 'REQUEST_CHANGES'], // a draft never reached the dashboard
  ['SUBMITTED', 'SUBMIT'],
  ['NEEDS_CORRECTION', 'APPROVE'],
  ['NEEDS_CORRECTION', 'REQUEST_CHANGES'],
  ['APPROVED', 'SUBMIT'],
  ['APPROVED', 'APPROVE'], // approving twice
  ['APPROVED', 'REQUEST_CHANGES'],
];

describe('nextStatus', () => {
  it.each(legal)('%s + %s -> %s', (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to);
  });

  it.each(illegal)('rejects %s + %s with a 409', (from, action) => {
    expect(() => nextStatus(from, action)).toThrow(ConflictException);
  });
});
