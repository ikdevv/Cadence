import { randomBytes } from 'node:crypto';

const PUBLIC_ID_BYTES = 9; // 9 bytes -> 12 base64url characters, no padding.

/**
 * A short, URL-safe public identifier for a resource — independent of its
 * database id. Never derived from the id (no hash/encoding of it), and never
 * derived from user-supplied fields like email or name. Meant to be exposed
 * in URLs and API responses in place of the primary key.
 */
export function generatePublicId(prefix: string): string {
  return `${prefix}_${randomBytes(PUBLIC_ID_BYTES).toString('base64url')}`;
}
