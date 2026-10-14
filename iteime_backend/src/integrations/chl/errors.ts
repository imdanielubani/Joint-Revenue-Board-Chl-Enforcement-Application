/**
 * Failures the CHL adapter reports. Each maps to one clear answer for the
 * mobile app, so a CHL failure is never mistaken for a verification result.
 */
export abstract class ChlError extends Error {
  abstract readonly kind: string;
}

/**
 * CHL could not be reached or did not finish (timeout, network error, 5xx).
 * Nothing was concluded: the app shows "Verification Unavailable".
 */
export class ChlUnavailableError extends ChlError {
  readonly kind = 'unavailable';
  constructor(message = 'The CHL service is not available.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'ChlUnavailableError';
  }
}

/** The email and password don't match a CHL account. */
export class ChlInvalidCredentialsError extends ChlError {
  readonly kind = 'invalidCredentials';
  constructor(message = 'The email or password is not correct.') {
    super(message);
    this.name = 'ChlInvalidCredentialsError';
  }
}

/** The account exists but has been deactivated centrally. */
export class ChlAccountDeactivatedError extends ChlError {
  readonly kind = 'accountDeactivated';
  constructor(message = 'This account has been deactivated.') {
    super(message);
    this.name = 'ChlAccountDeactivatedError';
  }
}

/** A session token CHL no longer accepts (expired or revoked). */
export class ChlSessionExpiredError extends ChlError {
  readonly kind = 'sessionExpired';
  constructor(message = 'The session has expired.') {
    super(message);
    this.name = 'ChlSessionExpiredError';
  }
}

/** Something CHL was asked about doesn't exist (e.g. an unknown transaction). */
export class ChlNotFoundError extends ChlError {
  readonly kind = 'notFound';
  constructor(message = 'Not found in CHL.') {
    super(message);
    this.name = 'ChlNotFoundError';
  }
}

/** CHL answered in a way the adapter doesn't understand (a contract mismatch). */
export class ChlBadResponseError extends ChlError {
  readonly kind = 'badResponse';
  constructor(message = 'CHL returned an unexpected response.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'ChlBadResponseError';
  }
}

/** The real CHL call isn't built yet: we are waiting for CHL's API documentation. */
export class ChlNotImplementedError extends ChlError {
  readonly kind = 'notImplemented';
  constructor(operation: string) {
    super(`The CHL call "${operation}" is waiting for the CHL API documentation.`);
    this.name = 'ChlNotImplementedError';
  }
}
