import type { Database } from '../../database/pool.js';
import { lagosDay } from '../../shared/lagos-time.js';
import type { AgentSession } from '../auth/session.repository.js';
import { countVerifications, listVerifications } from '../verifications/verification.repository.js';
import { verificationView } from '../verifications/verification.view.js';

/** The agent's day at a glance (SRD §7.1). */
export class DashboardService {
  constructor(private readonly dependencies: { database: Database; now: () => Date }) {}

  /** Today's counts (Lagos time) and the five most recent verifications. */
  async summary(session: AgentSession) {
    const { database, now } = this.dependencies;
    const day = lagosDay(now());
    const [counts, recent] = await Promise.all([
      countVerifications(database, session.agentId, day.from, day.to),
      listVerifications(database, session.agentId, { limit: 5 }),
    ]);
    return {
      day: { from: day.from.toISOString(), to: day.to.toISOString() },
      totals: {
        verifications: counts.total,
        activeTrips: counts.activeTrips,
        noActiveTrips: counts.noActiveTrips,
        // Violations come with the enforcement module.
        violationsIssued: 0,
      },
      recentVerifications: recent.map(verificationView),
    };
  }
}
