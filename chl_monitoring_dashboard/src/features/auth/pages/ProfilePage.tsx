import { formatDateTime } from '@/shared/lib/format'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ROLE_LABELS } from '../auth.schemas'
import { useCurrentUser, useSession } from '../session-context'
import styles from './ProfilePage.module.css'

/** Read-only: identity, role and areas are managed in CHL, not here. */
export function ProfilePage() {
  const user = useCurrentUser()
  const { session } = useSession()

  return (
    <>
      <PageHeader title="Profile" description="Your access details, as assigned in CHL." />
      <dl className={styles.details}>
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Organisation</dt>
        <dd>{user.organization ?? '—'}</dd>
        <dt>Role</dt>
        <dd>{ROLE_LABELS[user.role]}</dd>
        <dt>Areas</dt>
        <dd>{user.scopes.map((scope) => scope.name).join(', ') || '—'}</dd>
        <dt>Session ends</dt>
        <dd>{formatDateTime(session?.expiresAt)}</dd>
      </dl>
    </>
  )
}
