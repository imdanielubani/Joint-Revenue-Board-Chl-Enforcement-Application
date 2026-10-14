import { ChlError } from '../chl.client.js';

import type { ChlAccount, ChlIdentityClient, CredentialCheck } from '../chl.identity.js';

/**
 * FAKE CHL identity provider: a test double, NOT a CHL integration.
 *
 * It holds synthetic accounts only (example.test addresses, FAKE- IDs) and
 * one shared synthetic password. It exists so the ITEIME authentication flow
 * can be built and tested before CHL's contract is available (ADR-0010).
 * Configuration refuses it in production (CHL_IDENTITY_PROVIDER=fake), and
 * every response from an app using it carries `X-ITEIME-Fake-CHL: true`.
 */
export const FAKE_CHL_PASSWORD = 'fake-chl-password';

function account(
  id: string,
  name: string,
  email: string,
  role: ChlAccount['role'],
  scope: ChlAccount['scope'],
  status: ChlAccount['status'] = 'active',
): ChlAccount {
  return {
    id,
    name,
    email,
    role,
    organization: 'Fake Vendor Ltd (synthetic)',
    region: scope?.name ?? null,
    assignment: scope ? `${scope.name} (synthetic assignment)` : null,
    scope,
    status,
  };
}

const fakeLga = { level: 'lga', ref: 'FAKE-LGA-001', name: 'Fake LGA One' } as const;
const fakeState = { level: 'state', ref: 'FAKE-STATE-01', name: 'Fake State One' } as const;
const national = { level: 'national', ref: 'FAKE-NATIONAL', name: 'National (synthetic)' } as const;

/** The synthetic accounts. Emails end in example.test, which can never be real. */
export function fakeAccounts(): ChlAccount[] {
  return [
    account(
      'FAKE-AG-0001',
      'Fake Agent One',
      'agent.one@example.test',
      'ENFORCEMENT_AGENT',
      fakeLga,
    ),
    account(
      'FAKE-AG-0002',
      'Fake Agent Deactivated',
      'agent.deactivated@example.test',
      'ENFORCEMENT_AGENT',
      fakeLga,
      'deactivated',
    ),
    account('FAKE-SU-0001', 'Fake Supervisor', 'supervisor@example.test', 'SUPERVISOR', fakeState),
    account(
      'FAKE-PO-0001',
      'Fake Principal Officer',
      'principal.officer@example.test',
      'PRINCIPAL_OFFICER',
      fakeState,
    ),
    account(
      'FAKE-SA-0001',
      'Fake System Administrator',
      'admin@example.test',
      'SYSTEM_ADMINISTRATOR',
      national,
    ),
    account('FAKE-XX-0001', 'Fake Unknown Role', 'unknown.role@example.test', null, fakeLga),
  ];
}

export class FakeIdentityClient implements ChlIdentityClient {
  readonly kind = 'fake' as const;
  private readonly accounts = new Map(fakeAccounts().map((a) => [a.id, a]));
  private unavailable = false;
  readonly passwordResets: string[] = [];

  /** Test control: make every call fail as if CHL were down. */
  setUnavailable(unavailable: boolean): void {
    this.unavailable = unavailable;
  }

  /** Test control: change an account's status, as CHL administration would. */
  setStatus(accountId: string, status: ChlAccount['status']): void {
    const existing = this.accounts.get(accountId);
    if (existing) this.accounts.set(accountId, { ...existing, status });
  }

  /** Test control: remove an account, as if CHL no longer had it. */
  remove(accountId: string): void {
    this.accounts.delete(accountId);
  }

  private checkAvailable(): void {
    if (this.unavailable) throw new ChlError('unavailable', 'Fake CHL is simulating an outage');
  }

  private byEmail(email: string): ChlAccount | undefined {
    const wanted = email.trim().toLowerCase();
    return [...this.accounts.values()].find((a) => a.email === wanted);
  }

  async verifyCredentials(email: string, password: string): Promise<CredentialCheck> {
    this.checkAvailable();
    const found = this.byEmail(email);
    if (!found || password !== FAKE_CHL_PASSWORD) return { result: 'invalid' };
    return { result: 'valid', account: found };
  }

  async getAccount(accountId: string): Promise<ChlAccount | null> {
    this.checkAvailable();
    return this.accounts.get(accountId) ?? null;
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.checkAvailable();
    // Like a real provider, it says nothing about whether the account exists.
    if (this.byEmail(email)) this.passwordResets.push(email.trim().toLowerCase());
  }
}
