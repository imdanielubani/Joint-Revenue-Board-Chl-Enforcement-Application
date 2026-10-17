import { PageHeader } from './PageHeader'
import { StatePanel } from './StatePanel'

export function NoAccess() {
  return (
    <>
      <PageHeader title="No access" />
      <StatePanel
        kind="empty"
        message="Your account can't open this page. Ask your CHL administrator if you need access."
      />
    </>
  )
}
