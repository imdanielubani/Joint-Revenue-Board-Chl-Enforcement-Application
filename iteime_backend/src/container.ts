import type { Logger } from 'pino';

import type { Config } from './config/env.js';
import type { Database } from './database/pool.js';
import type { ChlAdapter } from './integrations/chl/adapter.js';
import { AuthService } from './modules/auth/auth.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { ETagService } from './modules/etags/etag.service.js';
import { NotificationService } from './modules/notifications/notification.service.js';
import { VerificationService } from './modules/verifications/verification.service.js';

/** What the services are built from: the outside world, passed in. */
export interface Infrastructure {
  logger: Logger;
  database: Database;
  chl: ChlAdapter;
  /** The clock (tests fix it). */
  now: () => Date;
  session: Config['session'];
}

/** Every service, built once. Routes receive what they need from here. */
export interface Container extends Infrastructure {
  auth: AuthService;
  verifications: VerificationService;
  dashboard: DashboardService;
  notifications: NotificationService;
  etags: ETagService;
}

/** The composition root: the only place services are constructed. */
export function createContainer(infrastructure: Infrastructure): Container {
  const { logger, database, chl, now, session } = infrastructure;
  return {
    ...infrastructure,
    auth: new AuthService({ database, chl, logger, now, session }),
    verifications: new VerificationService({ database, chl, now }),
    dashboard: new DashboardService({ database, now }),
    notifications: new NotificationService(database),
    etags: new ETagService(chl),
  };
}
