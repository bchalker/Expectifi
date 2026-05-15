/** Same-origin `/api/*` (Vite dev proxy → Express). */

export type ApiErrorBody = { ok: false; error?: string }

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  let data: unknown
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok) {
    const err = data as ApiErrorBody
    const code = typeof err.error === 'string' ? err.error : `http_${res.status}`
    throw new ApiRequestError(res.status, code)
  }
  return data as T
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}
