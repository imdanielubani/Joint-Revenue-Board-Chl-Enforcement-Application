import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageHeader } from '@/shared/ui/PageHeader'
import { StatePanel } from '@/shared/ui/StatePanel'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <StatePanel
        kind="empty"
        message="This page doesn't exist."
        action={<Link to={paths.home}>Go to the dashboard</Link>}
      />
    </>
  )
}
