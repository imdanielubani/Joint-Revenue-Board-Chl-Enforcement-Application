import { paths } from '@/config/paths'
import { organizationLabel } from '@/features/agents/agents-display'
import { useModuleLink } from '@/features/auth/use-module-link'
import {
  actionStatusLabel,
  actionStatusTone,
  outcomeLabel,
  outcomeStyle,
} from '@/features/overview/overview-display'
import { formatShortDateTime } from '@/shared/lib/format'
import type { SearchResults } from '../search.schemas'
import { ResultGroup } from './ResultGroup'
import styles from './SearchResultsList.module.css'

/** Every group of results, in order, each item leading to its own page where the user may open it. */
export function SearchResultsList({ results }: { results: SearchResults }) {
  const link = useModuleLink()
  return (
    <div className={styles.groups}>
      <ResultGroup
        title="Vehicles"
        icon="verifications/card-etag.svg"
        items={results.vehicles.map((vehicle) => ({
          key: vehicle.plate,
          main: vehicle.plate,
          sub: [vehicle.vehicleId ?? 'Not resolved by CHL', vehicle.vehicleType]
            .filter(Boolean)
            .join(' · '),
          meta: `${vehicle.verifications} ${vehicle.verifications === 1 ? 'verification' : 'verifications'} · last ${formatShortDateTime(vehicle.lastRecordedAt)}`,
          // Vehicle identity on Verifications & E-Tags.
          to: link(
            'verifications',
            `${paths.verifications}?plate=${encodeURIComponent(vehicle.plate)}`,
          ),
        }))}
      />
      <ResultGroup
        title="Agents"
        icon="overview/kpi-agents.svg"
        items={results.agents.map((agent) => ({
          key: agent.id,
          main: agent.name,
          sub: `${agent.id} · ${organizationLabel(agent.organization)}`,
          to: link('agents', paths.agent(agent.id)),
        }))}
      />
      <ResultGroup
        title="Verifications"
        icon="overview/kpi-scan.svg"
        items={results.verifications.map((record) => ({
          key: record.reference,
          main: record.reference,
          sub: `${record.plate} · ${record.agent.name} · ${record.location.name}, ${record.location.area}`,
          ...(record.result
            ? { pill: { ...outcomeStyle(record.result), label: outcomeLabel(record.result) } }
            : {}),
          meta: formatShortDateTime(record.recordedAt),
          // Its details popup on Verifications & E-Tags.
          to: link('verifications', `${paths.verifications}?ref=${record.reference}`),
        }))}
      />
      <ResultGroup
        title="Violations"
        icon="overview/kpi-violation.svg"
        items={results.violations.map((violation) => ({
          key: violation.id,
          main: violation.id,
          sub: `${violation.plate} · ${violation.category}`,
          pill: {
            tone: actionStatusTone(violation.status),
            label: actionStatusLabel(violation.status),
          },
          meta: formatShortDateTime(violation.recordedAt),
          // The case on Violations & cases.
          to: link('violations', `${paths.violations}?case=${violation.id}`),
        }))}
      />
      <ResultGroup
        title="Payment requests"
        icon="overview/kpi-doc.svg"
        items={results.payments.map((payment) => ({
          key: payment.id,
          main: payment.id,
          sub: `${payment.plate} · from ${payment.violationId}`,
          pill:
            payment.status === 'received'
              ? { tone: 'success', label: 'Payment received' }
              : { tone: 'warning', label: 'Payment pending' },
          meta: formatShortDateTime(payment.recordedAt),
          // The demand notice on Payments & compliance.
          to: link('payments', `${paths.payments}?notice=${payment.id}`),
        }))}
      />
    </div>
  )
}
