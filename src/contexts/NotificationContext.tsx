/**
 * NotificationContext — 읽지 않은 알림 수 전역 관리
 *
 * - 로그인 상태일 때 30초마다 폴링
 * - refreshUnread() 호출로 즉시 갱신 가능
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

interface NotificationContextValue {
  unreadCount: number
  refreshUnread: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshUnread: async () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await api.get('/notifications/')
      if (res.ok) {
        const data: { is_read: boolean }[] = await res.json()
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch { /* ignore */ }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0)
      return
    }
    refreshUnread()
    intervalRef.current = setInterval(refreshUnread, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLoggedIn, refreshUnread])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}
