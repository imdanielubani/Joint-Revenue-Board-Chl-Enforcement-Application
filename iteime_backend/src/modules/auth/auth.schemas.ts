import { z } from 'zod';

import { deviceSchema } from '../../http/validate.js';

export const emailSchema = z.string().trim().max(254).pipe(z.email('Enter a valid email address.'));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
  device: deviceSchema,
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(200) });

export const forgotPasswordSchema = z.object({ email: emailSchema });
