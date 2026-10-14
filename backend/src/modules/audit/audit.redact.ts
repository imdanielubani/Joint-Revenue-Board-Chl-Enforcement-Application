/** Keys whose values never enter the audit trail. */
const sensitiveKey = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|rfid|tag[-_]?id/i;

const maxDepth = 5;
const maxString = 500;

/**
 * A copy of `value` safe to store in the audit trail: sensitive keys are
 * replaced with "[redacted]", deep structures are cut off, and long strings
 * are truncated. Defence in depth: callers must not pass secrets at all.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > maxString ? `${value.slice(0, maxString)}…` : value;
  }
  if (value instanceof Date) return value.toISOString();
  if (depth >= maxDepth) return '[truncated]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        sensitiveKey.test(key) ? '[redacted]' : redact(inner, depth + 1),
      ]),
    );
  }
  return undefined; // functions, symbols, bigint: not recorded
}

/** "agent.one@example.test" → "a***@example.test": enough to correlate, not to read. */
export function maskEmail(email: string): string {
  const [local = '', domain] = email.trim().toLowerCase().split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}
