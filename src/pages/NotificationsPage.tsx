/**
 * NotificationsPage.tsx
 *
 * GET  /api/v1/notifications/            → 전체 알림
 * PATCH /api/v1/notifications/{id}/read  → 읽음 처리
 *
 * 카테고리 필터: 전체 | 댓글 | 좋아요 | 스터디 | 시스템
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import CategorySelector from '../components/liquid-glass/CategorySelector'
import type { NotificationResponse } from '../types/api'
import { useNotification } from '../contexts/NotificationContext'

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
  comment:     { icon: '💬', color: '#0071e3', bg: '#e8f0fe' },
  chat:        { icon: '🗨️', color: '#E07535', bg: '#fef3e8' },
  like:        { icon: '♥',  color: '#ff3b30', bg: '#fde8e8' },
  application: { icon: '📋', color: '#e07535', bg: '#fef3e8' },
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

function NotificationCard({
  n,
  onRead,
}: {
  n: NotificationResponse
  onRead: (id: number) => Promise<void>
}) {
  const meta = getMeta(n.type)
  const navigate = useNavigate()
  const targetPath = getTargetPath(n.type, n.related_id)
  const isClickable = !n.is_read || targetPath != null

  const handleClick = async () => {
    if (!n.is_read) await onRead(n.id)
    if (targetPath) navigate(targetPath)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={isClickable ? handleClick : undefined}
      style={{
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
        {/* 타입 레이블 */}
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
            <span style={{ fontSize: 12, color: '#0071e3', margin: 0 }}>
              자세히 보기 →
            </span>
          )}
        </div>
      </div>

      {/* 읽지 않음 dot */}
      {!n.is_read && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#0071e3',
          flexShrink: 0, marginTop: 6,
        }} />
      )}
    </motion.div>
  )
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState<Category>('all')
  const { refreshUnread } = useNotification()

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      if (res.ok) setNotifications(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

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

  const filtered   = notifications.filter(n => matchCategory(n.type, category))
  const unreadTotal = notifications.filter(n => !n.is_read).length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 52,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* 타이틀 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>
              알림
            </h1>
            {unreadTotal > 0 && (
              <p style={{ fontSize: 13, color: '#6e6e73', margin: '4px 0 0' }}>
                읽지 않은 알림 {unreadTotal}개
              </p>
            )}
          </div>
          {unreadTotal > 0 && (
            <button
              onClick={handleReadAll}
              style={{
                fontSize: 13, color: '#0071e3',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, letterSpacing: '-0.01em',
              }}>
              모두 읽음
            </button>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div style={{ marginBottom: 24 }}>
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
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(n => (
                <NotificationCard key={n.id} n={n} onRead={handleRead} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
