import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppError } from '../../../src/shared/errors/app-error.js';
import { errorCodes } from '../../../src/shared/errors/error-codes.js';
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
  it('answers AppError with the registered status and default message', async () => {
    const res = await request(appThrowing(new AppError('ACCOUNT_DEACTIVATED'))).get('/boom');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This account has been deactivated.',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('keeps a custom message and details', async () => {
    const err = new AppError('VALIDATION_ERROR', { message: 'Bad cursor.', details: [1] });
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Bad cursor.',
      details: [1],
    });
  });

  it('answers validation errors with 400 and {field, message} details', async () => {
    const parsed = z.object({ plate: z.string() }).safeParse({});
    const res = await request(appThrowing(parsed.error)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'plate', message: expect.any(String) }]);
  });

  it('hides the details of unexpected errors', async () => {
    const err = new Error('relation "secret_table" does not exist; password=hunter2');
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId: expect.any(String),
      },
    });
    expect(res.text).not.toContain('secret_table');
    expect(res.text).not.toContain('hunter2');
    expect(res.text).not.toContain('error-handler.test');
  });

  it('does not leak the cause of an upstream failure', async () => {
    const err = new AppError('CHL_UNAVAILABLE', { cause: new Error('ECONNREFUSED 10.0.0.7:443') });
    const res = await request(appThrowing(err)).get('/boom');
    expect(res.status).toBe(503);
    expect(res.text).not.toContain('10.0.0.7');
  });

  it('treats non-Error throwables as internal errors', async () => {
    const res = await request(appThrowing('just a string')).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('error code registry', () => {
  it('uses UPPER_SNAKE_CASE codes with error statuses and non-empty messages', () => {
    for (const [code, { status, message }] of Object.entries(errorCodes)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(message.length).toBeGreaterThan(0);
    }
  });
});
