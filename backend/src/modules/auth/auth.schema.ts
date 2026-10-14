import { z } from 'zod';

import { clients } from '../access-control/access-control.policy.js';

import type { Principal } from './auth.types.js';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const loginSchema = {
  body: z
    .object({
      email,
      password: z.string().min(1).max(256),
      // Absent for the mobile app (its existing contract); "monitoring" for
      // the Monitoring Dashboard.
      client: z.enum(clients).default('mobile'),
    })
    .strict(),
};

export const refreshSchema = {
  body: z.object({ refreshToken: z.string().min(20).max(200) }).strict(),
};

export const forgotPasswordSchema = {
  body: z.object({ email }).strict(),
};

/** The profile returned to clients. Field names follow the app's contract (ADR-0009). */
export function principalView(p: Principal) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    organization: p.organization,
    region: p.region,
    assignment: p.assignment,
    scope: p.scope,
  };
}
