import { describe, expect, it } from 'vitest';

import {
  hasPermission,
  mayUseClient,
  roles,
  scopeCovers,
  type Scope,
} from '../../../src/modules/access-control/access-control.policy.js';

const lga: Scope = { level: 'lga', ref: 'FAKE-LGA-001', name: 'Fake LGA One' };
const otherLga: Scope = { level: 'lga', ref: 'FAKE-LGA-002', name: 'Fake LGA Two' };
const state: Scope = { level: 'state', ref: 'FAKE-STATE-01', name: 'Fake State One' };
const national: Scope = { level: 'national', ref: 'FAKE-NATIONAL', name: 'National' };

describe('client access', () => {
  it('lets only enforcement agents use the mobile app', () => {
    expect(mayUseClient('ENFORCEMENT_AGENT', 'mobile')).toBe(true);
    for (const role of ['SUPERVISOR', 'PRINCIPAL_OFFICER', 'SYSTEM_ADMINISTRATOR'] as const) {
      expect(mayUseClient(role, 'mobile')).toBe(false);
    }
  });

  it('lets supervisors, Principal Officers and administrators use monitoring (MON §1)', () => {
    expect(mayUseClient('SUPERVISOR', 'monitoring')).toBe(true);
    expect(mayUseClient('PRINCIPAL_OFFICER', 'monitoring')).toBe(true);
    expect(mayUseClient('SYSTEM_ADMINISTRATOR', 'monitoring')).toBe(true);
    expect(mayUseClient('ENFORCEMENT_AGENT', 'monitoring')).toBe(false);
  });

  it('denies an unrecognized role everywhere', () => {
    expect(mayUseClient(null, 'mobile')).toBe(false);
    expect(mayUseClient(null, 'monitoring')).toBe(false);
  });
});

describe('permissions (deny by default)', () => {
  it('grants the complete audit trail only to the System Administrator (SRD §28)', () => {
    for (const role of roles) {
      expect(hasPermission(role, 'audit:read:all')).toBe(role === 'SYSTEM_ADMINISTRATOR');
    }
    expect(hasPermission(null, 'audit:read:all')).toBe(false);
  });
});

describe('geographic scope', () => {
  it('lets national scope see everything', () => {
    expect(scopeCovers(national, lga)).toBe(true);
    expect(scopeCovers(national, state)).toBe(true);
  });

  it('matches the same area', () => {
    expect(scopeCovers(lga, lga)).toBe(true);
  });

  it('denies another area at the same level', () => {
    expect(scopeCovers(lga, otherLga)).toBe(false);
  });

  it('denies across levels, because the hierarchy must come from CHL (Q-CHL-10)', () => {
    expect(scopeCovers(state, lga)).toBe(false);
    expect(scopeCovers(lga, state)).toBe(false);
  });

  it('denies a user without a scope', () => {
    expect(scopeCovers(null, lga)).toBe(false);
  });
});
