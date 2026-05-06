/**
 * NotificationsPage.tsx
 *
 * GET    /api/v1/notifications/            → 전체 알림
 * PATCH  /api/v1/notifications/{id}/read   → 읽음 처리
 * DELETE /api/v1/notifications/{id}        → 단건 삭제
 * DELETE /api/v1/notifications/all         → 전체 삭제
 * DELETE /api/v1/notifications/read-only   → 읽음 알림만 삭제
 *
 * 카테고리 필터: 전체 | 댓글 | 좋아요 | 스터디 | 시스템
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import CategorySelector from '../components/liquid-glass/CategorySelector'
import Pagination from '../components/Pagination'
import type { NotificationResponse } from '../types/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAlert } from '../contexts/AlertContext'

const PAGE_SIZE = 10

// ─── 카테고리 정의 ─────────────────────────────────────────────────────────────

type Category = 'all' | 'comment' | 'chat' | 'like' | 'study' | 'system'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',     label: '전체' },
  { id: 'comment', label: '댓글' },
  { id: 'chat',    label: '채팅' },
  { id: 'like',    label: '좋아요' },
  { id: 'study',   label: '스터디' },
  { id: 'system',  label: '시스템' },
]

const STUDY_TYPES = new Set(['application', 'accepted', 'rejected'])
const SYSTEM_TYPES = new Set(['notice', 'system', 'admin'])

function matchCategory(type: string, cat: Category): boolean {
  if (cat === 'all') return true
  if (cat === 'comment') return type === 'comment'
  if (cat === 'chat')    return type === 'chat'
  if (cat === 'like')    return type === 'like'
  if (cat === 'study')   return STUDY_TYPES.has(type)
  if (cat === 'system')  return SYSTEM_TYPES.has(type)
  return false
}

// ─── 아이콘 ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  comment:     { icon: '💬', color: '#0071E3', bg: '#e8f0fe' },
  chat:        { icon: '🗨️', color: '#0071E3', bg: '#e8f0fe' },
  like:        { icon: '♥',  color: '#ff3b30', bg: '#fde8e8' },
  application: { icon: '📋', color: '#0071e3', bg: '#e8f0fe' },
  accepted:    { icon: '✅', color: '#34c759', bg: '#e8fde8' },
  rejected:    { icon: '❌', color: '#ff3b30', bg: '#fde8e8' },
  notice:      { icon: '📢', color: '#6e6e73', bg: '#f2f2f7' },
  system:      { icon: '⚙️', color: '#6e6e73', bg: '#f2f2f7' },
}

function getMeta(type: string) {
  return TYPE_META[type] ?? { icon: '🔔', color: '#6e6e73', bg: '#f2f2f7' }
}

// ─── 타입 레이블 ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  comment:     '댓글',
  chat:        '채팅',
  like:        '좋아요',
  application: '스터디 신청',
  accepted:    '스터디 수락',
  rejected:    '스터디 거절',
  reservation: '예약',
  notice:      '공지',
  system:      '시스템',
}

function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? '알림'
}

// ─── 목적지 경로 ──────────────────────────────────────────────────────────────

function getTargetPath(type: string, relatedId: number | null): string | null {
  if (type === 'comment' || type === 'like') {
    return relatedId != null ? `/community/${relatedId}` : null
  }
  if (type === 'chat') {
    return relatedId != null ? `/groups/${relatedId}/chat` : null
  }
  if (type === 'application' || type === 'accepted' || type === 'rejected') {
    return relatedId != null ? `/groups/${relatedId}` : null
  }
  if (type === 'reservation') return '/my'
  return null
}

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}일 전`
  const dt = new Date(iso)
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`
}

// ─── 알림 카드 ────────────────────────────────────────────────────────────────

const POST_LINKED_TYPES = new Set(['comment', 'like'])

function NotificationCard({
  n,
  onRead,
  onDelete,
}: {
  n: NotificationResponse
  onRead: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const meta = getMeta(n.type)
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const targetPath = getTargetPath(n.type, n.related_id)
  const isClickable = !n.is_read || targetPath != null

  const handleClick = async () => {
    if (!n.is_read) await onRead(n.id)
    if (!targetPath) return

    if (POST_LINKED_TYPES.has(n.type) && n.related_id != null) {
      const res = await api.get(`/posts/${n.related_id}`)
      if (!res.ok) {
        showAlert('삭제된 게시물입니다.', 'info')
        return
      }
    }

    navigate(targetPath, { state: { from: '/notifications' } })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(n.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
      onClick={isClickable ? handleClick : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '16px 20px',
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e5e5ea',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: n.is_read ? 0.7 : 1,
        transition: 'box-shadow 0.18s, opacity 0.2s',
      }}
      whileHover={isClickable ? { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } : {}}
    >
      {/* 아이콘 뱃지 */}
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: meta.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {meta.icon}
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 500,
          color: meta.color,
          background: meta.bg,
          borderRadius: 6,
          padding: '1px 7px',
          marginBottom: 6,
          letterSpacing: '-0.01em',
        }}>
          {getTypeLabel(n.type)}
        </span>
        <p style={{
          fontSize: 14,
          color: n.is_read ? '#6e6e73' : '#1d1d1f',
          margin: '0 0 4px',
          lineHeight: 1.5,
          fontWeight: n.is_read ? 400 : 500,
        }}>
          {n.message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>
            {relativeTime(n.created_at)}
          </p>
          {targetPath && (
            <span style={{ fontSize: 12, color: '#0071E3', margin: 0 }}>
              자세히 보기 →
            </span>
          )}
        </div>
      </div>

      {/* 우측: 삭제 버튼 + 읽지 않음 dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={handleDelete}
          title="알림 삭제"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#aeaeb2',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            transition: 'color 0.15s, background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ff3b30'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#fde8e8'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#aeaeb2'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          ×
        </button>
        {!n.is_read && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#0071E3', flexShrink: 0,
          }} />
        )}
      </div>
    </motion.div>
  )
}

// ─── 일괄 삭제 드롭다운 ───────────────────────────────────────────────────────

function BulkDeleteMenu({
  onDeleteAll,
  onDeleteRead,
  hasRead,
}: {
  onDeleteAll: () => void
  onDeleteRead: () => void
  hasRead: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="liquid"
        style={{
          fontSize: 13,
          color: '#ff3b30',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 14px',
          borderRadius: 20,
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          ['--c-glass' as string]: '#ff3b30',
        } as React.CSSProperties}
      >
        삭제
        <span style={{ fontSize: 10, lineHeight: 1, marginTop: 1 }}>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e5ea',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              minWidth: 140,
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => { onDeleteAll(); setOpen(false) }}
              style={menuItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#fff1f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              전체 삭제
            </button>
            {hasRead && (
              <button
                onClick={() => { onDeleteRead(); setOpen(false) }}
                style={{ ...menuItemStyle, borderTop: '1px solid #f2f2f7' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff1f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                읽음 알림만 삭제
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 13,
  color: '#ff3b30',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
  transition: 'background 0.12s',
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshUnread } = useNotification()

  const category = (searchParams.get('category') as Category) ?? 'all'
  const page = Number(searchParams.get('page') ?? '1')

  const setCategory = (cat: Category) => {
    setSearchParams(prev => { prev.set('category', cat); prev.set('page', '1'); return prev }, { replace: true })
  }
  const setPage = (p: number) => {
    setSearchParams(prev => { prev.set('page', String(p)); return prev }, { replace: true })
  }

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      if (res.ok) setNotifications(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // ── 읽음 처리 ──────────────────────────────────────────────────────────────

  const handleRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    refreshUnread()
  }

  const handleReadAll = async () => {
    const unread = notifications.filter(n => !n.is_read)
    await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)))
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    refreshUnread()
  }

  const handleReadCategory = async () => {
    const unread = notifications.filter(n => matchCategory(n.type, category) && !n.is_read)
    await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)))
    setNotifications(prev =>
      prev.map(n => matchCategory(n.type, category) ? { ...n, is_read: true } : n)
    )
    refreshUnread()
  }

  // ── 삭제 처리 ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    await api.delete(`/notifications/${id}`)
    setNotifications(prev => prev.filter(n => n.id !== id))
    refreshUnread()
  }

  const handleDeleteAll = async () => {
    await api.delete('/notifications/all')
    setNotifications([])
    refreshUnread()
  }

  const handleDeleteRead = async () => {
    await api.delete('/notifications/read-only')
    setNotifications(prev => prev.filter(n => !n.is_read))
    refreshUnread()
  }

  // ── 파생 상태 ──────────────────────────────────────────────────────────────

  const filtered         = notifications.filter(n => matchCategory(n.type, category))
  const unreadTotal      = notifications.filter(n => !n.is_read).length
  const unreadInCategory = filtered.filter(n => !n.is_read).length
  const hasReadAny       = notifications.some(n => n.is_read)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const categoryLabel = CATEGORIES.find(c => c.id === category)?.label ?? ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 52,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* 타이틀 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>
            알림
          </h1>
          {unreadTotal > 0 && (
            <p style={{ fontSize: 13, color: '#6e6e73', margin: '4px 0 0' }}>
              읽지 않은 알림 {unreadTotal}개
            </p>
          )}
        </div>

        {/* 카테고리 필터 + 액션 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <CategorySelector
            theme="light"
            selected={category}
            onSelect={(id) => setCategory(id as Category)}
            categories={CATEGORIES.map(cat => ({
              id: cat.id,
              label: cat.label,
              badge: cat.id === 'all'
                ? notifications.filter(n => !n.is_read).length
                : notifications.filter(n => matchCategory(n.type, cat.id) && !n.is_read).length,
            }))}
          />

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* 카테고리별 읽음 (전체가 아닐 때만, 해당 카테고리 미읽음이 있을 때) */}
            {category !== 'all' && unreadInCategory > 0 && (
              <button
                onClick={handleReadCategory}
                className="liquid liquid-accent"
                style={{
                  fontSize: 13, border: 'none', cursor: 'pointer',
                  padding: '6px 14px', borderRadius: 20, letterSpacing: '-0.01em',
                }}>
                {categoryLabel} 읽음
              </button>
            )}
            {/* 모두 읽음 (전체 탭이거나, 카테고리 탭에서 해당 카테고리 미읽음이 없을 때) */}
            {unreadTotal > 0 && (category === 'all' || unreadInCategory === 0) && (() => {
              const isDisabled = category !== 'all' && unreadInCategory === 0
              return (
                <button
                  onClick={isDisabled ? undefined : handleReadAll}
                  disabled={isDisabled}
                  className={isDisabled ? undefined : 'liquid liquid-accent'}
                  style={{
                    fontSize: 13, border: 'none',
                    padding: '6px 14px', borderRadius: 20, letterSpacing: '-0.01em',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.35 : 1,
                    color: isDisabled ? '#6e6e73' : undefined,
                    background: isDisabled ? '#e5e5ea' : undefined,
                    transition: 'opacity 0.2s',
                  }}
                >
                  모두 읽음
                </button>
              )
            })()}
            {/* 삭제 드롭다운 */}
            {notifications.length > 0 && (
              <BulkDeleteMenu
                onDeleteAll={handleDeleteAll}
                onDeleteRead={handleDeleteRead}
                hasRead={hasReadAny}
              />
            )}
          </div>
        </div>

        {/* 알림 목록 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: 14 }}>
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p style={{ fontSize: 15, color: '#6e6e73', margin: 0 }}>알림이 없습니다.</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedItems.map(n => (
                  <NotificationCard key={n.id} n={n} onRead={handleRead} onDelete={handleDelete} />
                ))}
              </div>
            </AnimatePresence>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{ marginTop: 32 }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
