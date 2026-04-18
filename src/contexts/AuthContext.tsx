/**
 * AuthContext.tsx
 *
 * 백엔드는 커스텀 JWT(httpOnly Refresh Token + Body Access Token) 방식을 사용.
 * Supabase는 DB로만 사용하므로 Supabase Auth가 아닌 localStorage 기반으로 세션을 관리.
 *
 * - loading: 초기 /auth/me 조회 완료 전
 * - isLoggedIn: user !== null
 * - login(accessToken, userId): 토큰 저장 후 프로필 조회 → isLoggedIn 즉시 갱신
 * - logout(): 서버 로그아웃 + 로컬 초기화
 * - refresh(): /auth/me 재조회
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { MeResponse } from '../types/api'

interface AuthState {
  isLoggedIn: boolean
  user: MeResponse | null
  loading: boolean
  login: (accessToken: string, userId: number) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/auth/me')
      if (res.ok) {
        setUser(await res.json())
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // 앱 마운트 시 한 번 조회
  useEffect(() => { fetchMe() }, [fetchMe])

  const login = useCallback(async (accessToken: string, userId: number) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('user_id', String(userId))
    await fetchMe()
  }, [fetchMe])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!user,
      user,
      loading,
      login,
      logout,
      refresh: fetchMe,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
