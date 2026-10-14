import { describe, expect, it } from 'vitest';

import { maskEmail, redact } from '../../../src/modules/audit/audit.redact.js';
import { AuditService } from '../../../src/modules/audit/audit.service.js';
import { MemoryPersistence } from '../../support/memory-persistence.js';

const context = { requestId: 'req-1', ip: '127.0.0.1' };

describe('redact', () => {
  it('replaces sensitive keys at any depth', () => {
    expect(
      redact({
        password: 'p',
        refreshToken: 't',
        nested: { Authorization: 'Bearer x', apiKey: 'k', rfidTagId: 'E200', keep: 'ok' },
        list: [{ secret: 's' }],
      }),
    ).toEqual({
      password: '[redacted]',
      refreshToken: '[redacted]',
      nested: {
        Authorization: '[redacted]',
        apiKey: '[redacted]',
        rfidTagId: '[redacted]',
        keep: 'ok',
      },
      list: [{ secret: '[redacted]' }],
    });
  });

  it('truncates long strings and deep structures', () => {
    expect((redact('x'.repeat(600)) as string).length).toBe(501);
    expect(redact({ a: { b: { c: { d: { e: { f: 1 } } } } } })).toEqual({
      a: { b: { c: { d: { e: '[truncated]' } } } },
    });
  });

  it('masks emails', () => {
    expect(maskEmail('Agent.One@Example.test')).toBe('a***@example.test');
    expect(maskEmail('not-an-email')).toBe('***');
  });
});

describe('AuditService', () => {
  it('records actor, action, outcome, target and request context', async () => {
    const persistence = new MemoryPersistence();
    await new AuditService(persistence.audit).record({
      actor: { type: 'principal', id: 'FAKE-SA-0001', role: 'SYSTEM_ADMINISTRATOR' },
      action: 'audit.read',
      outcome: 'success',
      target: { type: 'session', id: 's-1' },
      context,
      details: { token: 'should-not-be-stored', returned: 3 },
    });
    expect(persistence.auditRows[0]).toMatchObject({
      actorType: 'principal',
      actorId: 'FAKE-SA-0001',
      actorRole: 'SYSTEM_ADMINISTRATOR',
      action: 'audit.read',
      outcome: 'success',
      targetType: 'session',
      targetId: 's-1',
      requestId: 'req-1',
      ip: '127.0.0.1',
      details: { token: '[redacted]', returned: 3 },
    });
  });

  it('records anonymous and system actors without an ID', async () => {
    const persistence = new MemoryPersistence();
    const audit = new AuditService(persistence.audit);
    await audit.record({
      actor: { type: 'anonymous' },
      action: 'auth.login',
      outcome: 'failure',
      context,
    });
    await audit.record({
      actor: { type: 'system' },
      action: 'auth.session.revoke',
      outcome: 'success',
      context,
    });
    expect(persistence.auditRows.map((e) => [e.actorType, e.actorId, e.actorRole])).toEqual([
      ['anonymous', null, null],
      ['system', null, null],
    ]);
  });

  it('exposes no way to change or delete events', () => {
    const audit = new AuditService(new MemoryPersistence().audit) as unknown as Record<
      string,
      unknown
    >;
    for (const method of ['update', 'delete', 'remove', 'edit']) {
      expect(audit[method]).toBeUndefined();
    }
  });
});
