import { constructHeaders } from 'data/fetchers'
import { BASE_PATH } from 'lib/constants'
import { ResponseError } from 'types'

export async function requestAgentApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const defaultHeaders = await constructHeaders({ 'Content-Type': 'application/json' })
  const headers = new Headers(defaultHeaders)

  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  const response = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    headers,
  })

  let data: unknown = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorData = data as {
      error?: { message?: string }
      message?: string
    } | null
    const message = errorData?.error?.message ?? errorData?.message ?? 'Request failed'
    const retryAfterHeader = response.headers.get('Retry-After')

    throw new ResponseError(
      message,
      response.status,
      response.headers.get('X-Request-Id') ?? undefined,
      retryAfterHeader ? parseInt(retryAfterHeader) : undefined,
      new URL(response.url).pathname
    )
  }

  return data as T
}
