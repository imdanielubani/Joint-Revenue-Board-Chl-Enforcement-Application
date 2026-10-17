import type { z } from 'zod'
import { env } from '@/config/env'
import { ApiError } from './api-error'
import { getAuthHandlers } from './auth-bridge'

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  /** Send the access token (default true). */
  auth?: boolean
}

const TIMEOUT_MS = 20_000

/**
 * Calls the backend and checks the answer against `schema`, so a screen
 * never renders data in a shape it doesn't expect. On a 401 it renews the
 * access token once and retries.
 */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const useAuth = options.auth ?? true
  let response = await send(path, options, useAuth)

  if (response.status === 401 && useAuth) {
    const token = await getAuthHandlers()?.refreshAccessToken()
    if (token) response = await send(path, options, useAuth)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return schema.parse(undefined)

  const result = schema.safeParse(await response.json())
  if (!result.success) {
    throw new ApiError(
      response.status,
      'invalid_response',
      'The server sent an answer we could not read.',
    )
  }
  return result.data
}

async function send(path: string, options: RequestOptions, useAuth: boolean): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  const token = useAuth ? getAuthHandlers()?.getAccessToken() : null
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const signals = [AbortSignal.timeout(TIMEOUT_MS)]
  if (options.signal) signals.push(options.signal)

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.any(signals),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(
      0,
      'network_error',
      'The server could not be reached. Check the connection and try again.',
    )
  }
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/** Reads the backend's `{ error: { code, message, requestId } }` answer. */
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; requestId?: string }
    }
    if (body.error?.code) {
      return new ApiError(
        response.status,
        body.error.code,
        body.error.message ?? 'Something went wrong.',
        body.error.requestId,
      )
    }
  } catch {
    // Not JSON: fall through to the generic error.
  }
  return new ApiError(response.status, 'http_error', `The server answered ${response.status}.`)
}
