export type DependencyStatus = 'up' | 'down' | 'not_configured';

/** One dependency the service needs before it can serve traffic. */
export interface DependencyCheck {
  name: string;
  /** Resolves with the status; a rejection or timeout counts as "down". */
  check(): Promise<DependencyStatus>;
}

export interface ReadinessReport {
  status: 'ready' | 'not_ready';
  checks: Record<string, DependencyStatus>;
}
