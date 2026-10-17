import { MODULE_KEYS, type User } from '@/features/auth/auth.schemas'

/** Sample accounts for development; every one uses the password below. */
export const MOCK_PASSWORD = 'password'

/** Sample accounts that exist but are deactivated in CHL: sign-in is refused with a 403. */
export const MOCK_DEACTIVATED_EMAILS = ['deactivated@jrb.gov.ng']

export const MOCK_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Adaeze Okafor',
    email: 'admin@jrb.gov.ng',
    role: 'administrator',
    organization: 'Joint Revenue Board',
    scopes: [{ level: 'national', id: 'ng', name: 'Nigeria' }],
    modules: [...MODULE_KEYS],
  },
  {
    id: 'usr_supervisor',
    name: 'Tunde Bakare',
    email: 'supervisor@jrb.gov.ng',
    role: 'supervisor',
    organization: 'Joint Revenue Board',
    scopes: [{ level: 'state', id: 'la', name: 'Lagos' }],
    modules: MODULE_KEYS.filter((key) => key !== 'audit'),
  },
  {
    id: 'usr_po',
    name: 'Ngozi Eze',
    email: 'po@jrb.gov.ng',
    role: 'principal_officer',
    organization: 'Joint Revenue Board',
    scopes: [{ level: 'lga', id: 'la-ikeja', name: 'Ikeja' }],
    modules: ['overview', 'verifications', 'trips', 'violations', 'payments', 'notifications'],
  },
]
