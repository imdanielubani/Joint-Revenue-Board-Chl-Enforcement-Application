import type { DependencyCheck, DependencyStatus, ReadinessReport } from './health.types.js';
import type { Logger } from 'pino';

const defaultTimeoutMs = 2_000;

async function runCheck(
  dependency: DependencyCheck,
  timeoutMs: number,
  logger: Logger,
): Promise<DependencyStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([dependency.check(), timeout]);
  } catch (err) {
    logger.warn({ err, dependency: dependency.name }, 'readiness check failed');
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

/** Ready only when every dependency is up; "not_configured" is not ready. */
export async function checkReadiness(
  dependencies: DependencyCheck[],
  logger: Logger,
  timeoutMs = defaultTimeoutMs,
): Promise<ReadinessReport> {
  const results = await Promise.all(
    dependencies.map(async (d) => [d.name, await runCheck(d, timeoutMs, logger)] as const),
  );
  const checks = Object.fromEntries(results);
  const ready = results.every(([, status]) => status === 'up');
  return { status: ready ? 'ready' : 'not_ready', checks };
}
