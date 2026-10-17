import type { Overview } from '../overview.schemas'
import { CasesCard, LocationActivityCard, RepeatVehiclesCard } from './AttentionCards'
import { MethodCard, PaymentStatusCard, ViolationCategoriesCard } from './InsightCards'
import styles from './CardRows.module.css'

/** Methods, violation categories and payments, three across. */
export function InsightCardsRow({ overview }: { overview: Overview }) {
  return (
    <div className={styles.row}>
      <MethodCard methods={overview.methods} />
      <ViolationCategoriesCard categories={overview.violationCategories} />
      <PaymentStatusCard payments={overview.payments} />
    </div>
  )
}

/** Locations, cases and repeat vehicles, three across. */
export function AttentionCardsRow({ overview }: { overview: Overview }) {
  return (
    <div className={styles.row}>
      <LocationActivityCard locations={overview.locations} />
      <CasesCard cases={overview.cases} />
      <RepeatVehiclesCard repeat={overview.repeatVehicles} />
    </div>
  )
}
