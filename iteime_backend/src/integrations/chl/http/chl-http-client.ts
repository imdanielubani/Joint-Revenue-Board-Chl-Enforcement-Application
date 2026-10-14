import {
  ChlBadResponseError,
  ChlNotFoundError,
  ChlSessionExpiredError,
  ChlUnavailableError,
} from '../errors.js';

export interface ChlHttpClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  /** Injectable for tests. */
  fetch?: typeof fetch;
}

export interface ChlRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** An agent's CHL token, when the call is made on their behalf. */
  bearerToken?: string;
}

/**
 * Calls the existing CHL backend over HTTPS and turns its failures into
 * ChlErrors:
 * - no answer in time, a network error or a 5xx: ChlUnavailableError;
 * - 401: ChlSessionExpiredError (the adapter maps a rejected sign-in to
 *   ChlInvalidCredentialsError);
 * - 404: ChlNotFoundError;
 * - a body that isn't JSON: ChlBadResponseError.
 * The exact headers and error format are to be confirmed by CHL (G3, G8).
 */
export class ChlHttpClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ChlHttpClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  async request<T>(request: ChlRequest): Promise<T> {
    const url = new URL(request.path.replace(/^\//, ''), withTrailingSlash(this.options.baseUrl));
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    // TODO(chl): use CHL's real server-to-server authentication (G3).
    if (this.options.apiKey) headers['X-Api-Key'] = this.options.apiKey;
    if (request.bearerToken) headers.Authorization = `Bearer ${request.bearerToken}`;
    if (request.body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: request.method ?? 'GET',
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw new ChlUnavailableError('CHL did not answer in time or could not be reached.', {
        cause: error,
      });
    }

    if (response.status >= 500) {
      throw new ChlUnavailableError(`CHL answered ${response.status}.`);
    }
    if (response.status === 401) throw new ChlSessionExpiredError();
    if (response.status === 404) throw new ChlNotFoundError();
    if (!response.ok) {
      throw new ChlBadResponseError(`CHL answered ${response.status}.`);
    }
    if (response.status === 204) return undefined as T;

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new ChlBadResponseError('CHL returned a body that is not JSON.', { cause: error });
    }
  }
}

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}
