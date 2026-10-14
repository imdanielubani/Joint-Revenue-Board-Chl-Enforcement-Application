import { Writable } from 'node:stream';

import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { ChlError } from '../../../../src/integrations/chl/chl.client.js';
import { guardIdentityClient } from '../../../../src/integrations/chl/chl.guard.js';
import {
  FAKE_CHL_PASSWORD,
  FakeIdentityClient,
  fakeAccounts,
} from '../../../../src/integrations/chl/fake/fake-identity-client.js';
import { createIdentityClient } from '../../../../src/integrations/chl/index.js';
import { UnconfiguredIdentityClient } from '../../../../src/integrations/chl/unconfigured-identity-client.js';
import { parseConfig } from '../../../../src/config/env.js';
import { silentLogger } from '../../../support/app.js';

import type { ChlIdentityClient } from '../../../../src/integrations/chl/chl.identity.js';

/** An identity client whose every call does `behaviour`. */
function stub(behaviour: () => Promise<unknown>): ChlIdentityClient {
  return {
    kind: 'fake',
    verifyCredentials: behaviour as ChlIdentityClient['verifyCredentials'],
    getAccount: behaviour as ChlIdentityClient['getAccount'],
    requestPasswordReset: behaviour as ChlIdentityClient['requestPasswordReset'],
  };
}

function capturingLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(String(chunk));
      done();
    },
  });
  return { logger: pino({ level: 'info' }, stream), lines };
}

const guarded = (inner: ChlIdentityClient, timeoutMs = 50) =>
  guardIdentityClient(inner, { timeoutMs, logger: silentLogger });

async function failureKind(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err instanceof ChlError ? err.kind : `not a ChlError: ${String(err)}`;
  }
  return 'resolved';
}

describe('CHL boundary guard (ADR-0006)', () => {
  it('maps a call that never answers to "timeout"', async () => {
    const client = guarded(stub(() => new Promise(() => undefined)));
    expect(await failureKind(client.getAccount('FAKE-AG-0001'))).toBe('timeout');
  });

  it('maps any non-CHL error (network, 5xx) to "unavailable"', async () => {
    const client = guarded(stub(() => Promise.reject(new TypeError('fetch failed'))));
    expect(await failureKind(client.verifyCredentials('a@example.test', 'x'))).toBe('unavailable');
  });

  it('passes ChlError kinds through unchanged', async () => {
    const client = guarded(stub(() => Promise.reject(new ChlError('unauthorized', 'bad key'))));
    expect(await failureKind(client.getAccount('x'))).toBe('unauthorized');
  });

  it('maps a malformed answer to "invalid_response"', async () => {
    const client = guarded(stub(async () => ({ result: 'valid', account: { id: 42 } })));
    expect(await failureKind(client.verifyCredentials('a@example.test', 'x'))).toBe(
      'invalid_response',
    );
  });

  it('returns confirmed negative answers as results, not failures', async () => {
    const client = guarded(new FakeIdentityClient());
    await expect(client.verifyCredentials('nobody@example.test', 'wrong')).resolves.toEqual({
      result: 'invalid',
    });
    await expect(client.getAccount('FAKE-NOPE')).resolves.toBeNull();
  });

  it('never logs emails, passwords or account IDs', async () => {
    const { logger, lines } = capturingLogger();
    const client = guardIdentityClient(
      stub(() => Promise.reject(new Error('boom'))),
      { timeoutMs: 50, logger },
    );
    await failureKind(client.verifyCredentials('agent.one@example.test', 'S3cret!pass'));
    await failureKind(client.getAccount('FAKE-AG-0001'));
    const output = lines.join('');
    expect(output).toContain('verifyCredentials');
    expect(output).not.toContain('agent.one@example.test');
    expect(output).not.toContain('S3cret!pass');
    expect(output).not.toContain('FAKE-AG-0001');
  });
});

describe('unconfigured identity client', () => {
  it('fails every call with "not_configured"', async () => {
    const client = guarded(new UnconfiguredIdentityClient());
    expect(await failureKind(client.verifyCredentials('a@example.test', 'x'))).toBe(
      'not_configured',
    );
    expect(await failureKind(client.getAccount('x'))).toBe('not_configured');
    expect(await failureKind(client.requestPasswordReset('a@example.test'))).toBe('not_configured');
  });

  it('is what configuration selects by default', () => {
    expect(createIdentityClient(parseConfig({}), silentLogger).kind).toBe('none');
    expect(
      createIdentityClient(parseConfig({ CHL_IDENTITY_PROVIDER: 'fake' }), silentLogger).kind,
    ).toBe('fake');
  });
});

describe('FAKE identity provider', () => {
  it('holds only synthetic accounts', () => {
    for (const account of fakeAccounts()) {
      expect(account.email).toMatch(/@example\.test$/);
      expect(account.id).toMatch(/^FAKE-/);
    }
  });

  it('accepts only the synthetic password', async () => {
    const fake = new FakeIdentityClient();
    expect((await fake.verifyCredentials('agent.one@example.test', FAKE_CHL_PASSWORD)).result).toBe(
      'valid',
    );
    expect((await fake.verifyCredentials('agent.one@example.test', 'guess')).result).toBe(
      'invalid',
    );
  });

  it('can simulate an outage, which is a failure and not an answer', async () => {
    const fake = new FakeIdentityClient();
    fake.setUnavailable(true);
    expect(await failureKind(guarded(fake).getAccount('FAKE-AG-0001'))).toBe('unavailable');
  });
});
