/**
 * AlertContext — 전역 알림 / 확인 다이얼로그 시스템
 *
 * showAlert(msg, type?)   : 자동 해제 알림 배너
 * showConfirm(msg)        : Promise<boolean> 확인/취소 배너
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

export type AlertType = 'success' | 'error' | 'info' | 'confirm'

export interface AlertState {
  message: string
  type: AlertType
}

interface AlertContextValue {
  alert: AlertState | null
  showAlert: (message: string, type?: Exclude<AlertType, 'confirm'>) => void
  showConfirm: (message: string) => Promise<boolean>
  dismiss: () => void
  handleConfirm: () => void
  handleCancel: () => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null)
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setAlert(null)
  }, [])

  const showAlert = useCallback(
    (message: string, type: Exclude<AlertType, 'confirm'> = 'info') => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setAlert({ message, type })
      timerRef.current = setTimeout(() => setAlert(null), 4000)
    },
    [],
  )

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current)
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setAlert({ message, type: 'confirm' })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    confirmResolveRef.current?.(true)
    confirmResolveRef.current = null
    setAlert(null)
  }, [])

  const handleCancel = useCallback(() => {
    confirmResolveRef.current?.(false)
    confirmResolveRef.current = null
    setAlert(null)
  }, [])

  return (
    <AlertContext.Provider
      value={{ alert, showAlert, showConfirm, dismiss, handleConfirm, handleCancel }}
    >
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}
