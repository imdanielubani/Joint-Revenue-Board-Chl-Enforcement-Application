import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppError } from '../../../src/shared/errors/app-error.js';
import { errorHandler } from '../../../src/shared/middleware/error-handler.js';
import { requestLogger } from '../../../src/shared/middleware/request-logger.js';
import { silentLogger } from '../../support/app.js';

function appThrowing(err: unknown) {
  const app = express();
  app.use(requestLogger(silentLogger));
  app.get('/boom', () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('answers AppError with its status, code and message', async () => {
    const app = appThrowing(new AppError(409, 'conflict', 'Already exists.'));
    const res = await request(app).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'conflict', message: 'Already exists.', requestId: expect.any(String) },
    });
  });

  it('answers validation errors with 400 and the failing paths', async () => {
    const parsed = z.object({ plate: z.string() }).safeParse({});
    const res = await request(appThrowing(parsed.error)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details).toEqual([{ path: 'plate', message: expect.any(String) }]);
  });

  it('hides the details of unexpected errors', async () => {
    const err = new Error('relation "secret_table" does not exist; password=hunter2');
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred.',
        requestId: expect.any(String),
      },
    });
    expect(res.text).not.toContain('secret_table');
    expect(res.text).not.toContain('hunter2');
    expect(res.text).not.toContain('error-handler.test');
  });

  it('treats non-Error throwables as internal errors', async () => {
    const res = await request(appThrowing('just a string')).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });
});
