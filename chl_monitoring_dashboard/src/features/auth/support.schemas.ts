import { z } from 'zod'

export const SUPPORT_MESSAGE_MAX_LENGTH = 2000

/** What the request is about; the support team sorts requests by it. */
export const ISSUE_TYPES = ['cant_sign_in', 'account_locked', 'wrong_access', 'other'] as const
export type IssueType = (typeof ISSUE_TYPES)[number]

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  cant_sign_in: 'Can’t sign in',
  account_locked: 'Account locked',
  wrong_access: 'Wrong access',
  other: 'Something else',
}

/** A sign-in or access request for CHL support. Every field is required. */
export const supportRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Enter your full name.')
    .max(120, 'Use 120 characters or fewer.'),
  email: z.email('Enter a valid email address.'),
  issueType: z.enum(ISSUE_TYPES, 'Choose what you need help with.'),
  message: z
    .string()
    .trim()
    .min(1, 'Describe what happened.')
    .max(SUPPORT_MESSAGE_MAX_LENGTH, `Use ${SUPPORT_MESSAGE_MAX_LENGTH} characters or fewer.`),
})
export type SupportRequest = z.infer<typeof supportRequestSchema>
