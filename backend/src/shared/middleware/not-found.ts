import { AppError } from '../errors/app-error.js';

import type { RequestHandler } from 'express';

/** Any request no route answered. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'));
};
