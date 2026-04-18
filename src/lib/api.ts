/**
 * api.ts
 *
 * fetch wrapper:
 * - localStorage의 access_token을 Authorization: Bearer {token} 헤더에 첨부
 * - 401 응답 시 /auth/refresh(httpOnly Refresh Token Rotation)로 토큰 갱신 후 재시도 (1회)
 * - 갱신 실패 시 localStorage 초기화 후 /auth 로 이동
 */

const BASE = '/api/v1'

function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // httpOnly Refresh Token 쿠키 자동 전송
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    return true
  } catch {
    return false
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && retry) {
    const ok = await tryRefresh()
    if (ok) return apiFetch(path, options, false)
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    window.location.href = '/auth'
    return res
  }

  return res
}

// ─── 편의 함수 ────────────────────────────────────────────────────────────────

export const api = {
  get: (path: string) => apiFetch(path, { method: 'GET' }),

  post: (path: string, body?: unknown) =>
    apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  patch: (path: string, body?: unknown) =>
    apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),

  postForm: (path: string, form: FormData) =>
    apiFetch(path, { method: 'POST', body: form }),
}
