import { PageHeader } from './PageHeader'
import { StatePanel } from './StatePanel'

interface ModulePlaceholderProps {
  title: string
  description: string
}

/** Stands in for a module's screen until it is built from the design. */
export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <StatePanel kind="empty" message="This screen will be built from the design." />
    </>
  )
}
