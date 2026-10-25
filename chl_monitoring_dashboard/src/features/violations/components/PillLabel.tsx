import { StatusLabel } from '@/shared/ui/StatusLabel'
import type { Pill } from '../violations-display'

/** A case status, closure or other pill, with its icon where it has one. */
export function PillLabel({ pill }: { pill: Pill }) {
  return (
    <StatusLabel tone={pill.tone} {...(pill.icon ? { icon: pill.icon } : {})}>
      {pill.label}
    </StatusLabel>
  )
}
