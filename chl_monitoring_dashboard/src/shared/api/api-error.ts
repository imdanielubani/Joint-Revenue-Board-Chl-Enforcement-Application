/** An expected failure from the backend, or no answer at all (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | undefined

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }

  /**
   * True when the backend could not be reached. A screen must show this as
   * "unavailable", never as a result such as "No Active Trip".
   */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
