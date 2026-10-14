import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../shared/errors/app-error.js';
import { validate, validated } from '../../shared/middleware/validate.js';
import { requirePermission } from '../access-control/access-control.middleware.js';
import { authOf, requestContext } from '../auth/auth.middleware.js';
import { auditOutcomes, type AuditEventRecord } from './audit.types.js';

import type { AuditService } from './audit.service.js';

const cursorSchema = z.object({ t: z.iso.datetime(), id: z.uuid() });

function encodeCursor(e: AuditEventRecord): string {
  return Buffer.from(JSON.stringify({ t: e.occurredAt.toISOString(), id: e.id })).toString(
    'base64url',
  );
}

function decodeCursor(cursor: string) {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    return { occurredAt: new Date(parsed.t), id: parsed.id };
  } catch {
    throw new AppError('VALIDATION_ERROR', {
      details: [{ field: 'query.cursor', message: 'Invalid cursor' }],
    });
  }
}

export const listAuditSchema = {
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().max(200).optional(),
      action: z.string().max(100).optional(),
      actorId: z.string().max(100).optional(),
      outcome: z.enum(auditOutcomes).optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
    })
    .strict(),
};

/** The API view of an audit event: not the database row. */
function auditEventView(e: AuditEventRecord) {
  return {
    id: e.id,
    occurredAt: e.occurredAt.toISOString(),
    actor: { type: e.actorType, id: e.actorId, role: e.actorRole },
    action: e.action,
    outcome: e.outcome,
    target: e.targetType ? { type: e.targetType, id: e.targetId } : null,
    requestId: e.requestId,
    ip: e.ip,
    details: e.details,
  };
}

/**
 * `GET /api/v1/monitoring/audit-events`: the complete audit trail, for System
 * Administrators only (SRD §4.4, §28; MON §12.2, §12.4). Newest first, cursor
 * paginated. Reading the audit trail is itself audited.
 */
export function auditRouter(audit: AuditService): Router {
  const router = Router();
  router.get(
    '/',
    requirePermission('audit:read:all', audit),
    validate(listAuditSchema),
    async (req, res) => {
      const { query } = validated(res, listAuditSchema);
      const events = await audit.list({
        limit: query.limit + 1,
        before: query.cursor ? decodeCursor(query.cursor) : undefined,
        action: query.action,
        actorId: query.actorId,
        outcome: query.outcome,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
      const page = events.slice(0, query.limit);
      const last = page.at(-1);
      const hasMore = events.length > query.limit;
      const { principal } = authOf(req);
      await audit.record({
        actor: { type: 'principal', id: principal.id, role: principal.role },
        action: 'audit.read',
        outcome: 'success',
        context: requestContext(req),
        details: { filters: { ...query, cursor: undefined }, returned: page.length },
      });
      res.json({
        items: page.map(auditEventView),
        nextCursor: hasMore && last ? encodeCursor(last) : null,
      });
    },
  );
  return router;
}
