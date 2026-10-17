import { z } from 'zod'

export const SUPPORT_MESSAGE_MAX_LENGTH = 2000

/** A sign-in or access request for CHL support. Every field is required. */
export const supportRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Enter your full name.')
    .max(120, 'Use 120 characters or fewer.'),
  email: z.email('Enter a valid email address.'),
  issueType: z
    .string()
    .trim()
    .min(1, 'Say what you need help with.')
    .max(120, 'Use 120 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(1, 'Describe what happened.')
    .max(SUPPORT_MESSAGE_MAX_LENGTH, `Use ${SUPPORT_MESSAGE_MAX_LENGTH} characters or fewer.`),
})
export type SupportRequest = z.infer<typeof supportRequestSchema>
