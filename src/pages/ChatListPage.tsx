/**
 * ChatListPage.tsx
 *
 * 내가 속한 채팅방 목록 페이지
 * - 접근: 로그인 필수 (App.tsx에서 ProtectedRoute 처리)
 * - 데이터: GET /api/v1/my/chats — 확정(종료) 상태 그룹 채팅방만 반환
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ChatRoomListItem } from '../types/api'
import CategorySelector from '../components/liquid-glass/CategorySelector'

// ─── 시간 포맷 ────────────────────────────────────────────────────────────────

function formatChatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (diffDays <= 1 && now.getDate() - d.getDate() === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

// ─── 아바타 색상 ───────────────────────────────────────────────────────────────

function avatarColor(groupId: number) {
  const hue = (groupId * 53 + 180) % 360
  return `hsl(${hue}, 48%, 50%)`
}

function avatarInitial(title: string) {
  return title.charAt(0)
}

// ─── ChatRoomCard ──────────────────────────────────────────────────────────────

function ChatRoomCard({
  room,
  onClick,
  index,
  notice,
  onFullView,
}: {
  room: ChatRoomListItem
  onClick: () => void
  index: number
  notice?: string
  onFullView?: (notice: string, rect: DOMRect, groupTitle: string, groupId: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const [exceedsThree, setExceedsThree] = useState(false)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const noticeBoxRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    setExpanded(false)
    setExceedsThree(false)
  }, [notice])

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || !notice) return
    if (!expanded) {
      ;(el.style as any).webkitLineClamp = 'unset'
      const fullHeight = el.clientHeight
      ;(el.style as any).webkitLineClamp = '1'
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18
      setClamped(fullHeight > lineHeight * 1.5)
    } else {
      setExceedsThree(el.scrollHeight > el.clientHeight + 1)
    }
  }, [notice, expanded])

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: notice ? 'flex-start' : 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 16,
        background: '#ffffff',
        border: room.is_leader ? '1px solid rgba(0,113,227,0.35)' : '1px solid #e5e5ea',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        boxShadow: room.is_leader
          ? '0 4px 20px rgba(0,113,227,0.12)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'visible',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        if (room.is_leader) {
          el.style.borderColor = 'rgba(0,113,227,0.6)'
          el.style.boxShadow = '0 4px 20px rgba(0,113,227,0.18)'
        } else {
          el.style.borderColor = '#d2d2d7'
          el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        if (room.is_leader) {
          el.style.borderColor = 'rgba(0,113,227,0.35)'
          el.style.boxShadow = '0 4px 20px rgba(0,113,227,0.12)'
        } else {
          el.style.borderColor = '#e5e5ea'
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        }
      }}
    >
      {/* 아바타 */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: avatarColor(room.group_id),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        marginTop: notice ? 2 : 0,
      }}>
        {avatarInitial(room.group_title)}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1열: 그룹명 · 조장 뱃지 · 멤버 수 | 최근 메시지 시각 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: notice ? 6 : 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
            <span style={{
              fontSize: 15, fontWeight: 600, color: '#1d1d1f',
              letterSpacing: '-0.02em', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1,
            }}>
              {room.group_title}
            </span>
            {room.is_leader && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#0071E3',
                background: 'rgba(0,113,227,0.08)',
                border: '1px solid rgba(0,113,227,0.2)',
                borderRadius: 999, padding: '1px 6px', flexShrink: 0,
              }}>
                조장
              </span>
            )}
            <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0, whiteSpace: 'nowrap' }}>
              멤버 {room.member_count}명
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {room.last_message_at ? formatChatTime(room.last_message_at) : ''}
          </span>
        </div>

        {/* 공지사항 박스 — notice 필터일 때만 표시 */}
        {notice && (
          <div
            ref={noticeBoxRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: expanded ? 'flex-start' : 'center',
              gap: 6,
              padding: '7px 10px',
              borderRadius: 8,
              background: 'rgba(0,113,227,0.05)',
              border: '1px solid rgba(0,113,227,0.12)',
              marginBottom: 7,
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#0071E3',
              letterSpacing: '0.02em',
              flexShrink: 0,
              paddingTop: expanded ? 1 : 0,
              lineHeight: '1.5',
            }}>
              공지
            </span>
            <span
              ref={textRef}
              style={{
                fontSize: 12,
                color: '#3a3a3c',
                flex: 1,
                lineHeight: 1.5,
                overflow: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                ...(expanded
                  ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }
                  : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, textOverflow: 'ellipsis' }),
              }}
            >
              {notice}
            </span>
            {clamped && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignSelf: 'stretch',
                flexShrink: 0,
                gap: 4,
              }}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
                  onKeyDown={(e) => e.key === 'Enter' && setExpanded(v => !v)}
                  style={{ fontSize: 11, color: '#0071E3', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {expanded ? '접기 ▲' : '펼치기 ▼'}
                </span>
                {expanded && exceedsThree && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onFullView?.(notice, noticeBoxRef.current!.getBoundingClientRect(), room.group_title, room.group_id) }}
                    onKeyDown={(e) => e.key === 'Enter' && onFullView?.(notice, noticeBoxRef.current!.getBoundingClientRect(), room.group_title, room.group_id)}
                    style={{ fontSize: 11, color: '#0071E3', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 'auto' }}
                  >
                    전체보기
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 마지막 행: 최근 메시지 미리보기 | 안읽은 메시지 뱃지 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{
            fontSize: 13, color: '#6e6e73',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {room.last_message ?? ''}
          </span>
          {room.unread_count > 0 && (
            <span style={{
              flexShrink: 0, minWidth: 20, height: 20, borderRadius: 10,
              background: '#ff3b30', color: '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
            }}>
              {room.unread_count > 99 ? '99+' : room.unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ─── 필터 탭 ──────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'leader' | 'notice' | 'unread'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',    label: '전체'      },
  { key: 'leader', label: '내가 조장' },
  { key: 'notice', label: '공지사항'  },
  { key: 'unread', label: '읽지 않은' },
]

// ─── ChatListPage ──────────────────────────────────────────────────────────────

export default function ChatListPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<ChatRoomListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [fullViewItem, setFullViewItem] = useState<{
    notice: string
    groupTitle: string
    groupId: number
    dx: number; dy: number
    fromW: number; fromH: number
    toW: number; toH: number
  } | null>(null)
  const [expandedH, setExpandedH] = useState<number | null>(null)
  const modalBodyRef = useRef<HTMLDivElement | null>(null)

  // 모달 열릴 때 페이지 스크롤 잠금
  useEffect(() => {
    if (fullViewItem) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [fullViewItem])

  // 모달 열릴 때 본문 overflow 측정 → 필요시 높이 확장
  useEffect(() => {
    if (!fullViewItem) { setExpandedH(null); return }
    const HEADER_H = 80
    const MAX_H = window.innerHeight - HEADER_H * 2
    // 스프링 수렴 후 측정 (~400ms)
    const timer = setTimeout(() => {
      const body = modalBodyRef.current
      if (!body || body.scrollHeight <= body.clientHeight) return
      const overflow = body.scrollHeight - body.clientHeight
      const newH = Math.min(fullViewItem.toH + overflow + 48, MAX_H)
      if (newH > fullViewItem.toH) setExpandedH(newH)
    }, 400)
    return () => clearTimeout(timer)
  }, [fullViewItem])

  useEffect(() => {
    api.get('/my/chats')
      .then(async res => {
        if (res.ok) setRooms(await res.json())
      })
      .finally(() => setLoading(false))
  }, [])

  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

  const getNotice = (groupId: number) =>
    localStorage.getItem(`chatNotice_${groupId}`)?.trim() ?? ''

  const sortedRooms = [...rooms].sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  })

  const filterCounts: Record<FilterType, number> = {
    all:    sortedRooms.length,
    leader: sortedRooms.filter(r => r.is_leader).length,
    notice: sortedRooms.filter(r => !!getNotice(r.group_id)).length,
    unread: sortedRooms.filter(r => r.unread_count > 0).length,
  }

  const filteredRooms = sortedRooms.filter(r => {
    if (activeFilter === 'leader') return r.is_leader
    if (activeFilter === 'notice') return !!getNotice(r.group_id)
    if (activeFilter === 'unread') return r.unread_count > 0
    return true
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: FONT,
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 페이지 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 40 }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#0071E3' }}>
            Chat Rooms
          </span>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.03em',
            margin: '8px 0 8px',
          }}>
            채팅
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
            확정된 스터디 그룹의 채팅방입니다.
          </p>
        </motion.div>

        {/* 필터 탭 */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 20 }}
          >
            <CategorySelector
              theme="light"
              selected={activeFilter}
              onSelect={(id) => setActiveFilter(id as FilterType)}
              categories={FILTERS.map(f => ({ id: f.key, label: f.label, badge: filterCounts[f.key] }))}
            />
          </motion.div>
        )}

        {/* 로딩 */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: 80,
                borderRadius: 16,
                background: '#e5e5ea',
                border: '1px solid #d2d2d7',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {/* 채팅방 없음 — 전체 목록 자체가 비어 있을 때 */}
        {!loading && rooms.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
              참여 중인 채팅방이 없습니다
            </p>
            <p style={{ fontSize: 13, color: '#aeaeb2', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
              스터디 그룹에 참여하고 조장이 그룹을 확정하면<br />채팅방이 열립니다.
            </p>
            <motion.button
              onClick={() => navigate('/groups')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              style={{
                marginTop: 8,
                padding: '10px 24px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                background: '#0071E3',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONT,
                letterSpacing: '-0.01em',
              }}
            >
              스터디 그룹 둘러보기
            </motion.button>
          </motion.div>
        )}

        {/* 필터 결과 없음 — 필터 적용 후 비어 있을 때 */}
        {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '60px 0',
              gap: 8,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
              해당하는 채팅방이 없습니다
            </p>
            <p style={{ fontSize: 13, color: '#aeaeb2', margin: 0 }}>
              {activeFilter === 'leader' && '내가 조장인 스터디 그룹이 없습니다.'}
              {activeFilter === 'notice' && '공지사항이 등록된 채팅방이 없습니다.'}
              {activeFilter === 'unread' && '읽지 않은 메시지가 없습니다.'}
            </p>
          </motion.div>
        )}

        {/* 채팅방 목록 */}
        {!loading && filteredRooms.length > 0 && (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {filteredRooms.map((room, i) => (
              <ChatRoomCard
                key={room.group_id}
                room={room}
                index={i}
                notice={activeFilter === 'notice' ? getNotice(room.group_id) : undefined}
                onFullView={(notice, rect, groupTitle, groupId) => {
                  const toW = Math.min(window.innerWidth - 32, 640)
                  const toH = Math.min(window.innerHeight * 0.8, 600)
                  setFullViewItem({
                    notice,
                    groupTitle,
                    groupId,
                    dx: (rect.left + rect.width / 2) - window.innerWidth / 2,
                    dy: (rect.top + rect.height / 2) - window.innerHeight / 2,
                    fromW: rect.width,
                    fromH: rect.height,
                    toW,
                    toH,
                  })
                }}
                onClick={() => navigate(`/groups/${room.group_id}/chat`, { state: { from: '/chats' } })}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* 공지 전체보기 모달 */}
      <AnimatePresence>
        {fullViewItem !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setFullViewItem(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: 24,
            }}
          >
            {/* 공지 박스 크기 → 모달 크기로 width/height 직접 애니메이션 */}
            <motion.div
              initial={{ width: fullViewItem.fromW, height: fullViewItem.fromH, x: fullViewItem.dx, y: fullViewItem.dy, borderRadius: 8 }}
              animate={{ width: fullViewItem.toW, height: expandedH ?? fullViewItem.toH, x: 0, y: 0, borderRadius: 20 }}
              exit={{ width: fullViewItem.fromW, height: fullViewItem.fromH, x: fullViewItem.dx, y: fullViewItem.dy, borderRadius: 8, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255, 255, 255, 0.84)',
                backdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
                WebkitBackdropFilter: 'blur(30px) saturate(1.8) brightness(1.05)',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: '0px 10px 40px rgba(0,0,0,0.11), 0px 1px 0px rgba(255,255,255,0.9), inset 0px 0px 0px 1px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {/* 내용은 확장 후 fade-in + blur 해제 */}
              <motion.div
                initial={{ opacity: 0.3, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.38, delay: 0.06, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
              >
                {/* ── 헤더 ── */}
                <div style={{
                  position: 'relative',
                  padding: '26px 26px 22px',
                  background: 'linear-gradient(145deg, rgba(0,113,227,0.11) 0%, rgba(0,113,227,0.04) 60%, rgba(255,255,255,0) 100%)',
                  borderBottom: '1px solid rgba(0,113,227,0.1)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {/* 장식 원 — 대 */}
                  <div style={{
                    position: 'absolute', top: -50, right: -50,
                    width: 180, height: 180, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,113,227,0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  {/* 장식 원 — 소 */}
                  <div style={{
                    position: 'absolute', bottom: -20, right: 60,
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 상단 레이블 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{
                          width: 4, height: 16, borderRadius: 2,
                          background: 'linear-gradient(180deg, #0071E3, #4DA3FF)',
                        }} />
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#0071E3',
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>
                          Notice
                        </span>
                      </div>
                      {/* 그룹명 */}
                      <h2 style={{
                        fontSize: 22, fontWeight: 800, color: '#1d1d1f',
                        letterSpacing: '-0.04em', margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {fullViewItem.groupTitle}
                      </h2>
                      <span style={{ fontSize: 12, color: '#aeaeb2' }}>공지사항 전체 내용</span>
                    </div>

                  </div>
                </div>

                {/* ── 본문 ── */}
                <div ref={modalBodyRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', background: 'rgba(248, 248, 250, 0.5)' }}>
                  {/* 인용 블록 스타일 */}
                  <div style={{
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderLeft: '4px solid #0071E3',
                    borderRadius: '0 12px 12px 0',
                    padding: '18px 20px',
                    boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    <p style={{
                      fontSize: 14.5,
                      color: '#1d1d1f',
                      lineHeight: 1.9,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}>
                      {fullViewItem.notice}
                    </p>
                  </div>
                </div>

                {/* ── 푸터 ── */}
                <div style={{
                  padding: '14px 26px',
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => setFullViewItem(null)}
                    className="liquid"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '9px 20px', borderRadius: 12, border: 'none',
                      color: '#6e6e73', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit',
                    }}
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      setFullViewItem(null)
                      navigate(`/groups/${fullViewItem.groupId}/chat`, { state: { from: '/chats' } })
                    }}
                    className="liquid liquid-action"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '9px 20px', borderRadius: 12, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      letterSpacing: '-0.01em', fontFamily: 'inherit',
                    }}
                  >
                    채팅방 입장
                    <span style={{ fontSize: 12, opacity: 0.85 }}>→</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
