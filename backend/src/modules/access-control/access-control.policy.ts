/**
 * Roles, client surfaces, permissions and geographic scope.
 *
 * Only grants supported by a source or an explicit project decision are
 * listed. Everything else is denied by default. The full permission matrix
 * is an open question (Q-ROL-1); add a grant only with its source.
 */

/** User roles named in SRD §4 and the SRD cover page. String values per REQ §3.1 and the app. */
export const roles = [
  'ENFORCEMENT_AGENT',
  'SUPERVISOR',
  'PRINCIPAL_OFFICER',
  'SYSTEM_ADMINISTRATOR',
] as const;
export type Role = (typeof roles)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (roles as readonly string[]).includes(value);
}

/**
 * The client applications that sign in. Each session belongs to exactly one,
 * and each API surface accepts only its own client's sessions. The ITEIME
 * Admin Dashboard isn't here yet: its roles are undefined (Q-ROL-1).
 */
export const clients = ['mobile', 'monitoring'] as const;
export type Client = (typeof clients)[number];

/** Which roles may sign in to which client. */
export const clientRoles: Record<Client, readonly Role[]> = {
  // Only enforcement agents may use the mobile app (recorded decision, REQ
  // §3.1; the app's AGENT_ACCESS_DENIED handling). See Q-ROL-9.
  mobile: ['ENFORCEMENT_AGENT'],
  // "the signed-in administrator, supervisor, or Principal Officer" (MON §1).
  monitoring: ['SUPERVISOR', 'PRINCIPAL_OFFICER', 'SYSTEM_ADMINISTRATOR'],
};

export function mayUseClient(role: Role | null, client: Client): boolean {
  return role !== null && clientRoles[client].includes(role);
}

/** Permissions beyond "signed in". Each grant cites its source. */
export const permissions = ['audit:read:all'] as const;
export type Permission = (typeof permissions)[number];

const grants: Record<Permission, readonly Role[]> = {
  // "The System Administrator shall have access to the complete audit trail"
  // (SRD §4.4, §28; MON §12.2, §12.4). Supervisors' audit access is undefined
  // (Q-ROL-5), so they get none yet.
  'audit:read:all': ['SYSTEM_ADMINISTRATOR'],
};

export function hasPermission(role: Role | null, permission: Permission): boolean {
  return role !== null && grants[permission].includes(role);
}

/** Geographic scope levels, SRD §4.1 and MON §4. */
export const scopeLevels = [
  'enforcement_location',
  'enforcement_zone',
  'ward',
  'lga',
  'state',
  'region',
  'subregion',
  'national',
] as const;
export type ScopeLevel = (typeof scopeLevels)[number];

/** A centrally assigned scope. `ref` is CHL's identifier for the area (Q-CHL-13). */
export interface Scope {
  level: ScopeLevel;
  ref: string;
  name: string;
}

/**
 * Whether a user with `scope` may see data located in `target`.
 *
 * National scope covers everything. Otherwise only the same area matches:
 * how zones, wards, LGAs, states, regions and subregions nest must come from
 * CHL configuration (MON §4; Q-CHL-10), so a different level is denied
 * rather than guessed. No scope means no access.
 */
export function scopeCovers(scope: Scope | null, target: Scope): boolean {
  if (!scope) return false;
  if (scope.level === 'national') return true;
  return scope.level === target.level && scope.ref === target.ref;
}
