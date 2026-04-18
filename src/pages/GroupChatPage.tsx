/**
 * GroupChatPage.tsx
 *
 * 스터디 그룹 전용 채팅방
 * - 접근 권한: 조장 + accepted 멤버
 * - 실시간 WebSocket 연결 (ws://host/api/v1/groups/{id}/chat/ws?token=...)
 * - 히스토리: GET /api/v1/groups/{id}/chat/messages
 * - 읽음 처리: POST /api/v1/groups/{id}/chat/read?last_message_id=N
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import type {
  ChatMessageResponse,
  ChatRoomInfoResponse,
  WsMessagePayload,
} from '../types/api'

// ─── 시간 포맷 ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// ─── 아바타 색상 ──────────────────────────────────────────────────────────────

function avatarColor(userId: number) {
  const hue = (userId * 47 + 120) % 360
  return `hsl(${hue}, 55%, 52%)`
}

function avatarInitial(nickname: string) {
  return nickname.charAt(0).toUpperCase()
}

// ─── 시스템 메시지 줄 ─────────────────────────────────────────────────────────

function SystemLine({ content }: { content: string }) {
  return (
    <div style={{ textAlign: 'center', margin: '12px 0' }}>
      <span style={{
        display: 'inline-block',
        fontSize: 11, color: '#aeaeb2',
        background: 'rgba(174,174,178,0.10)',
        borderRadius: 999, padding: '3px 12px',
      }}>
        {content}
      </span>
    </div>
  )
}

// ─── 날짜 구분선 ──────────────────────────────────────────────────────────────

function DateDivider({ dateStr }: { dateStr: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: '#e5e5ea' }} />
      <span style={{ fontSize: 11, color: '#aeaeb2', whiteSpace: 'nowrap' }}>{dateStr}</span>
      <div style={{ flex: 1, height: 1, background: '#e5e5ea' }} />
    </div>
  )
}

// ─── 전체보기 모달 (메시지) ───────────────────────────────────────────────────

function MessageFullViewModal({
  msg,
  isMine,
  onClose,
}: {
  msg: ChatMessageResponse
  isMine: boolean
  onClose: () => void
}) {
  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e5ea' }} />
        </div>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px 12px', gap: 10, borderBottom: '1px solid #f2f2f7' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: avatarColor(msg.sender_id),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {avatarInitial(msg.sender_nickname)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
              {msg.sender_nickname}
              {isMine && <span style={{ fontSize: 11, color: '#aeaeb2', marginLeft: 5, fontWeight: 400 }}>나</span>}
            </div>
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
              {new Date(msg.created_at).toLocaleString('ko-KR', {
                month: 'long', day: 'numeric', weekday: 'short',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#f2f2f7', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#6e6e73', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 40px',
          fontSize: 15,
          color: '#1d1d1f',
          lineHeight: 1.7,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          letterSpacing: '-0.01em',
        }}>
          {msg.content}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── 전체보기 모달 (공지사항) ─────────────────────────────────────────────────

function NoticeFullViewModal({
  notice,
  onClose,
}: {
  notice: string
  onClose: () => void
}) {
  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, margin: '0 auto',
          background: '#ffffff', borderRadius: '20px 20px 0 0',
          maxHeight: '80dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e5ea' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px 12px', borderBottom: '1px solid #f2f2f7', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📢</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', flex: 1 }}>공지사항</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f2f2f7', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6e6e73' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px', fontSize: 14, color: '#1d1d1f', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {notice}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── 공지사항 바 (헤더 바로 아래) ────────────────────────────────────────────

const NOTICE_COLLAPSED_LINES = 2
const NOTICE_EXPANDED_LINES = 7

function NoticeBar({
  notice,
  onFullView,
}: {
  notice: string
  onFullView: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isClamped, setIsClamped] = useState(false)
  const [totalLines, setTotalLines] = useState(0)

  useLayoutEffect(() => { setExpanded(false) }, [notice])

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || expanded) return
    setIsClamped(el.scrollHeight > el.clientHeight + 1)
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20.15
    setTotalLines(Math.round(el.scrollHeight / lh))
  }, [notice, expanded])

  const needsExpand = isClamped
  const needsFullView = totalLines >= 6

  return (
    <div style={{
      background: 'rgba(255,248,240,0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(224,117,53,0.18)',
      flexShrink: 0,
      zIndex: 9,
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📢</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            ref={contentRef}
            style={{
              fontSize: 13,
              color: '#3a2010',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: expanded ? NOTICE_EXPANDED_LINES : NOTICE_COLLAPSED_LINES,
              overflow: 'hidden',
            }}
          >
            {notice}
          </div>
          {(needsExpand || needsFullView) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              {needsExpand && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#E07535', padding: 0, letterSpacing: '-0.01em' }}
                >
                  {expanded ? '접기 ▲' : '펼치기 ▼'}
                </button>
              )}
              {needsFullView && (
                <button
                  onClick={onFullView}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#E07535', padding: 0, marginLeft: 'auto' }}
                >
                  전체보기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 공지 편집 모달 ───────────────────────────────────────────────────────────

function NoticeEditModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', fontFamily: FONT }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: '20px 20px 0 0', padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e5ea' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>공지 편집</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ fontSize: 13, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer' }}>취소</button>
            <button
              onClick={() => onSave(draft)}
              style={{ fontSize: 13, fontWeight: 600, color: '#E07535', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              저장
            </button>
          </div>
        </div>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="공지사항을 입력하세요..."
          style={{
            width: '100%', minHeight: 160, maxHeight: 300,
            border: '1px solid #e5e5ea', borderRadius: 12,
            padding: '12px 14px', fontSize: 14, color: '#1d1d1f',
            lineHeight: 1.6, resize: 'vertical', outline: 'none',
            fontFamily: FONT, boxSizing: 'border-box',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ─── 메시지 버블 ──────────────────────────────────────────────────────────────
//
// iOS SMS 전송 애니메이션 (isMine + isAnimating 조합):
//  - 외부 motion.div: Y축 이동 — 입력창 위치(animOriginY)에서 자연 위치(0)로 날아오름
//  - 내부 motion.div: scaleX 수축 — 입력창 너비(1.55x)에서 버블 너비(1x)로 줄어듦
//  - transformOrigin: '100% 100%' — 오른쪽 하단 고정(우측 정렬 버블의 iOS 거동)

// 650자 이상 또는 17줄 이상이면 접힌 상태로 표시
const CHAR_LIMIT = 650
const LINE_LIMIT = 17

function MessageBubble({
  msg,
  isMine,
  showAvatar,
  isAnimating,
  animOriginY,
  onAnimDone,
  onFullView,
  unreadCount,
}: {
  msg: ChatMessageResponse
  isMine: boolean
  showAvatar: boolean
  isAnimating?: boolean
  animOriginY?: number
  onAnimDone?: () => void
  onFullView?: () => void       // 전체보기 모달 열기
  unreadCount?: number          // 이 세션에서 보낸 메시지의 미읽음 추정 수
}) {
  const iosAnim = isAnimating && isMine

  // 더보기 필요 여부 판단 (650자 이상 또는 17줄 이상)
  const lines = msg.content.split('\n')
  const isLong = msg.content.length >= CHAR_LIMIT || lines.length >= LINE_LIMIT

  // 항상 접힌 상태 표시 (더보기 → 전체보기 모달)
  let displayContent = msg.content
  if (isLong) {
    if (lines.length >= LINE_LIMIT) {
      displayContent = lines.slice(0, LINE_LIMIT - 1).join('\n')
    } else {
      displayContent = msg.content.slice(0, CHAR_LIMIT)
    }
  }

  return (
    <motion.div
      initial={iosAnim ? { opacity: 1, y: animOriginY ?? 72 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={iosAnim
        ? { type: 'spring', damping: 26, stiffness: 280, mass: 0.85 }
        : { duration: 0.2 }
      }
      onAnimationComplete={iosAnim ? onAnimDone : undefined}
      style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}
    >
      {/* 아바타 (상대방만, 첫 메시지에만) */}
      {!isMine && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar && (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: avatarColor(msg.sender_id),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {avatarInitial(msg.sender_nickname)}
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {!isMine && showAvatar && (
          <span style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 3, paddingLeft: 4 }}>
            {msg.sender_nickname}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
          {/* ★ iOS 버블 너비 수축 애니메이션 */}
          <motion.div
            initial={iosAnim ? { scaleX: 1.55 } : { scaleX: 1 }}
            animate={{ scaleX: 1 }}
            transition={iosAnim
              ? { type: 'spring', damping: 22, stiffness: 380, mass: 0.6 }
              : { duration: 0 }
            }
            style={{
              transformOrigin: isMine ? '100% 100%' : '0% 100%',
              padding: '9px 13px',
              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: isMine ? '#E07535' : '#ffffff',
              border: isMine ? 'none' : '1px solid #e5e5ea',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              fontSize: 14,
              color: isMine ? '#fff' : '#1d1d1f',
              lineHeight: 1.55,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayContent}

            {/* 더보기 → 전체보기 모달 */}
            {isLong && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); onFullView?.() }}
                  style={{
                    display: 'inline-block',
                    background: isMine ? 'rgba(255,255,255,0.22)' : 'rgba(224,117,53,0.10)',
                    border: 'none', borderRadius: 8,
                    padding: '3px 10px', fontSize: 12, fontWeight: 600,
                    color: isMine ? '#fff' : '#E07535',
                    cursor: 'pointer', letterSpacing: '-0.01em',
                  }}
                >
                  전체보기 ▼
                </button>
              </div>
            )}
          </motion.div>

          {/* 시간 + 읽음 수 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2, paddingBottom: 2, flexShrink: 0 }}>
            {/* 읽음 수: 내가 이 세션에서 보낸 메시지에만 표시 */}
            {isMine && unreadCount !== undefined && unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#E07535', lineHeight: 1 }}>
                {unreadCount}
              </span>
            )}
            <span style={{ fontSize: 10, color: '#aeaeb2' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── 사이드바 공지 섹션 ────────────────────────────────────────────────────────

function SidebarNoticeSection({
  noticeText,
  isLeader,
  onEdit,
  onDelete,
  onFullView,
}: {
  noticeText: string
  isLeader: boolean
  onEdit: () => void
  onDelete: () => void
  onFullView: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isClamped, setIsClamped] = useState(false)   // 3줄 이상 → 펼치기 표시
  const [totalLines, setTotalLines] = useState(0)     // 6줄 이상 → 전체보기 표시

  // 공지 변경 시 접힌 상태로 초기화
  useLayoutEffect(() => {
    setExpanded(false)
  }, [noticeText])

  // 접힌 상태에서 실제 시각적 줄 수 측정
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || expanded) return
    // line-clamp 적용 중: scrollHeight = 전체 높이, clientHeight = 2줄 높이
    const clamped = el.scrollHeight > el.clientHeight + 1
    setIsClamped(clamped)
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 18.6
    setTotalLines(Math.round(el.scrollHeight / lh))
  }, [noticeText, expanded])

  const needsExpand = isClamped              // 3줄 이상
  const needsFullView = totalLines >= 6      // 6줄 이상

  const STYLE = { fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: 0 }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={STYLE}>공지</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLeader && noticeText.trim() && (
            <button onClick={onDelete} style={{ fontSize: 10, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              삭제
            </button>
          )}
          {isLeader && (
            <button onClick={onEdit} style={{ fontSize: 10, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {noticeText.trim() ? '수정' : '추가'}
            </button>
          )}
        </div>
      </div>

      {noticeText.trim() ? (
        <div>
          <div
            ref={contentRef}
            style={{
              fontSize: 12,
              color: '#3a2010',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'rgba(255,248,240,0.8)',
              borderRadius: 8,
              padding: '8px 10px',
              ...(expanded ? {} : {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }),
            }}
          >
            {noticeText}
          </div>
          {needsExpand && (
            <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
              <button
                onClick={() => setExpanded(v => !v)}
                style={{ fontSize: 10, fontWeight: 600, color: '#E07535', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {expanded ? '접기 ▲' : '펼치기 ▼'}
              </button>
              {needsFullView && (
                <button
                  onClick={onFullView}
                  style={{ fontSize: 10, fontWeight: 600, color: '#E07535', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  전체보기
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#c7c7cc', margin: 0, textAlign: 'center', padding: '6px 0' }}>
          {isLeader ? '추가 버튼으로 공지를 등록하세요' : '등록된 공지가 없습니다'}
        </p>
      )}
    </div>
  )
}

// ─── GroupChatPage ─────────────────────────────────────────────────────────────

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // 진입 경로 — ChatListPage에서 왔으면 '/chats', 그 외엔 그룹 상세로 복귀
  const backPath: string = (location.state as { from?: string } | null)?.from === '/chats'
    ? '/chats'
    : `/groups/${id}`
  const { showAlert } = useAlert()
  const groupId = Number(id)

  const [roomInfo, setRoomInfo] = useState<ChatRoomInfoResponse | null>(null)
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [systemMessages, setSystemMessages] = useState<{ key: string; content: string }[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [input, setInput] = useState('')
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // iOS 전송 애니메이션 — 방금 내가 보낸 메시지 ID 집합
  const [animatingMsgIds, setAnimatingMsgIds] = useState<Set<number>>(new Set())
  // 전송 버튼 로딩 상태 — 전송 직후부터 버블 애니메이션 완료까지
  const [isBubbleAnimating, setIsBubbleAnimating] = useState(false)
  // 이 세션에서 내가 보낸 메시지 ID → 읽음 수 표시용
  const [sessionMsgIds, setSessionMsgIds] = useState<Set<number>>(new Set())
  // 전체보기 모달 대상 메시지
  const [fullViewMsg, setFullViewMsg] = useState<ChatMessageResponse | null>(null)
  // 공지사항 (localStorage 폴백 — 백엔드 notice 필드 연동 준비)
  const [noticeText, setNoticeText] = useState<string>('')
  const [noticeFullView, setNoticeFullView] = useState(false)
  const [editingNotice, setEditingNotice] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const inputBarRef = useRef<HTMLDivElement | null>(null)
  const isSendingRef = useRef(false) // 동기적 lock — 중복 전송 방지
  // iOS 애니메이션용 — 마지막 전송 내용과 입력창 높이(Y 오프셋)를 전송 시 캡처
  const lastSentContentRef = useRef<string | null>(null)
  const animOriginYRef = useRef<number>(72)
  // 버블 애니메이션 진행 중 lock — 스테이트보다 ref가 클로저 stale 문제 없이 안전
  const isAnimatingRef = useRef(false)

  // ── 채팅방 초기 정보 로드 ──────────────────────────────────────────────────
  const fetchRoomInfo = useCallback(async () => {
    const res = await api.get(`/groups/${groupId}/chat/info`)
    if (!res.ok) {
      if (res.status === 403) {
        showAlert('채팅방은 확정된 멤버만 입장할 수 있습니다.', 'error')
        navigate(backPath)
      } else if (res.status === 404) {
        navigate('/groups')
      }
      return
    }
    setRoomInfo(await res.json())
  }, [groupId, navigate, showAlert, backPath])

  // ── 히스토리 로드 ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (beforeId?: number) => {
    setLoadingHistory(true)
    try {
      const params = beforeId ? `?limit=50&before_id=${beforeId}` : '?limit=50'
      const res = await api.get(`/groups/${groupId}/chat/messages${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (beforeId) {
        // 이전 메시지 prepend
        setMessages(prev => [...data.messages, ...prev])
      } else {
        setMessages(data.messages)
      }
      setHasMore(data.has_more)
    } finally {
      setLoadingHistory(false)
    }
  }, [groupId])

  // ── 읽음 처리 ────────────────────────────────────────────────────────────
  const markRead = useCallback(async (lastMsgId: number) => {
    await api.post(`/groups/${groupId}/chat/read?last_message_id=${lastMsgId}`)
  }, [groupId])

  // ── WebSocket 연결 ────────────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    // Vite 개발 서버: ws:// + 같은 호스트 + Vite 프록시가 /api → 백엔드로 중계
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/v1/groups/${groupId}/chat/ws?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    setWsState('connecting')

    ws.onopen = () => {
      setWsState('open')
    }

    ws.onmessage = (e) => {
      try {
        const payload: WsMessagePayload = JSON.parse(e.data)

        if (payload.type === 'system' && payload.content) {
          const key = `sys-${Date.now()}-${Math.random()}`
          setSystemMessages(prev => [...prev, { key, content: payload.content! }])
          return
        }

        if (payload.type === 'message' && payload.id) {
          const msg: ChatMessageResponse = {
            id: payload.id,
            group_id: payload.group_id!,
            sender_id: payload.sender_id!,
            sender_nickname: payload.sender_nickname!,
            content: payload.content!,
            created_at: payload.created_at!,
          }
          setMessages(prev => {
            // 중복 방지
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // 내 메시지면: iOS 전송 애니메이션 트리거 + 세션 추적 + 읽음 처리
          if (msg.sender_id === user?.id) {
            if (
              lastSentContentRef.current !== null &&
              lastSentContentRef.current === msg.content
            ) {
              setAnimatingMsgIds(prev => new Set([...prev, msg.id]))
              lastSentContentRef.current = null
            }
            // 이 세션에서 보낸 메시지로 등록 (읽음 수 표시용)
            setSessionMsgIds(prev => new Set([...prev, msg.id]))
            markRead(msg.id)
          }
        }
      } catch {
        // 파싱 실패 무시
      }
    }

    ws.onclose = () => {
      setWsState('closed')
    }

    ws.onerror = () => {
      setWsState('closed')
    }
  }, [groupId, user?.id, markRead])

  // ── 초기화 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRoomInfo()
    fetchHistory()
    connectWs()

    return () => {
      wsRef.current?.close()
    }
  }, [fetchRoomInfo, fetchHistory, connectWs])

  // ── 공지 초기화 — localStorage 우선, roomInfo.notice 폴백 ──────────────────
  useEffect(() => {
    const stored = localStorage.getItem(`chatNotice_${groupId}`)
    if (stored && stored.trim()) {
      setNoticeText(stored.trim())
    } else if (roomInfo?.notice?.trim()) {
      setNoticeText(roomInfo.notice)
    } else {
      setNoticeText('')
    }
  }, [groupId, roomInfo])

  // ── 공지 저장 (localStorage — 백엔드 지원 전 임시 저장) ──────────────────────
  const saveNotice = useCallback((text: string) => {
    setNoticeText(text)
    if (text.trim()) {
      localStorage.setItem(`chatNotice_${groupId}`, text.trim())
    } else {
      localStorage.removeItem(`chatNotice_${groupId}`)
    }
    setEditingNotice(false)
  }, [groupId])

  // ── 파생값 ────────────────────────────────────────────────────────────────
  const isLeader = roomInfo?.members.find(m => m.user_id === user?.id)?.is_leader ?? false
  const memberCount = roomInfo?.members.length ?? 0

  // ── 히스토리 로드 후 스크롤 맨 아래로 ──────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && !loadingHistory) {
      // 최초 로드 시에만 맨 아래로
      const list = listRef.current
      if (list && list.scrollTop === 0) {
        bottomRef.current?.scrollIntoView()
      }
    }
  }, [messages.length, loadingHistory])

  // ── 새 메시지 도착 시 스크롤 ──────────────────────────────────────────────
  const prevLengthRef = useRef(0)
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (messages.length > prevLengthRef.current && last) {
      // 내 메시지이거나 이미 스크롤이 하단 근처면 자동 스크롤
      const list = listRef.current
      const isNearBottom = list
        ? list.scrollHeight - list.scrollTop - list.clientHeight < 120
        : true
      if (last.sender_id === user?.id || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        // 읽음 처리
        markRead(last.id)
      }
    }
    prevLengthRef.current = messages.length
  }, [messages, user?.id, markRead])

  // ── 더 불러오기 (스크롤 상단 감지) ────────────────────────────────────────
  const handleScroll = () => {
    const list = listRef.current
    if (!list) return
    if (list.scrollTop < 60 && hasMore && !loadingHistory) {
      const firstId = messages[0]?.id
      const prevHeight = list.scrollHeight
      fetchHistory(firstId).then(() => {
        // 스크롤 위치 유지
        requestAnimationFrame(() => {
          list.scrollTop = list.scrollHeight - prevHeight
        })
      })
    }
  }

  // ── iOS 애니메이션 정리 콜백 ──────────────────────────────────────────────
  const clearAnimation = useCallback((msgId: number) => {
    setAnimatingMsgIds(prev => {
      const next = new Set(prev)
      next.delete(msgId)
      return next
    })
    isAnimatingRef.current = false
    setIsBubbleAnimating(false)
  }, [])

  // ── 메시지 전송 ───────────────────────────────────────────────────────────
  const sendMessage = () => {
    // isSendingRef: 동기적 lock.
    // useState 기반 guard만으로는 React 배치 업데이트 사이에 두 번 호출될 수 있어
    // ref로 동기적으로 차단한다. (버튼 클릭 + Enter 동시, 한글 IME Enter 이중 발화 등)
    if (isSendingRef.current || isAnimatingRef.current) return
    const content = input.trim()
    if (!content) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showAlert('연결이 끊겼습니다. 페이지를 새로고침해 주세요.', 'error')
      return
    }
    // iOS 애니메이션용: 전송 내용 + 입력창 높이(Y 오프셋) 캡처
    lastSentContentRef.current = content
    animOriginYRef.current = (inputBarRef.current?.offsetHeight ?? 72) + 8
    // 버튼 로딩 상태 활성화
    isAnimatingRef.current = true
    setIsBubbleAnimating(true)
    // WS 무응답 안전장치 — 3초 후 자동 해제
    setTimeout(() => {
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false
        setIsBubbleAnimating(false)
      }
    }, 3000)
    isSendingRef.current = true
    wsRef.current.send(JSON.stringify({ content }))
    setInput('')
    inputRef.current?.focus()
    // 다음 프레임에 lock 해제 — 연속 전송은 허용하되 동일 이벤트 중복은 차단
    requestAnimationFrame(() => { isSendingRef.current = false })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing 체크: 한글·중문 IME 입력 중 Enter로 글자를 확정할 때
    // keydown이 두 번 발생(isComposing=true → false)하는 현상을 방지한다.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── 재연결 ────────────────────────────────────────────────────────────────
  const reconnect = () => {
    wsRef.current?.close()
    connectWs()
  }

  // ── 렌더링 ────────────────────────────────────────────────────────────────

  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#f5f5f7', fontFamily: FONT, overflow: 'hidden' }}>

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 56, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e5e5ea', flexShrink: 0, zIndex: 10 }}>
        <div style={{ height: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>

          {/* 뒤로가기 */}
          <motion.button
            onClick={() => navigate(backPath)}
            whileHover={{ x: -2 }} whileTap={{ scale: 0.9 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6e6e73', fontSize: 18, lineHeight: 1 }}
          >
            ←
          </motion.button>

          {/* 타이틀 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {roomInfo?.group_title ?? '채팅방'}
            </div>
            <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
              {roomInfo ? `멤버 ${roomInfo.members.length}명` : '로딩 중...'}
            </div>
          </div>

          {/* WS 연결 상태 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsState === 'open' ? '#34C759' : wsState === 'connecting' ? '#FF9500' : '#ff3b30', transition: 'background 0.3s' }} />
            {wsState === 'closed' && (
              <motion.button onClick={reconnect} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ fontSize: 11, color: '#E07535', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                재연결
              </motion.button>
            )}
          </div>

          {/* ── LiquidGlass 햄버거 버튼 ── */}
          <motion.button
            onClick={() => setIsSidebarOpen(v => !v)}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            title="멤버 목록"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isSidebarOpen
                ? 'rgba(224,117,53,0.18)'
                : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isSidebarOpen
                ? '1px solid rgba(224,117,53,0.35)'
                : '1px solid rgba(200,200,210,0.55)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: 0, flexShrink: 0,
            }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 1.5, borderRadius: 1,
                width: i === 2 ? 11 : 15,
                background: isSidebarOpen ? '#E07535' : '#1d1d1f',
                transition: 'background 0.2s, width 0.2s',
              }} />
            ))}
          </motion.button>
        </div>
      </div>

      {/* ── 공지사항 바 (헤더 바로 아래, 공지 있을 때만) ──────────────────── */}
      <AnimatePresence>
        {noticeText.trim() && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <NoticeBar
              notice={noticeText}
              onFullView={() => setNoticeFullView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── 본문 + 사이드바 ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* 메시지 영역 */}
          <div ref={listRef} onScroll={handleScroll}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 0', display: 'flex', flexDirection: 'column' }}>

            {/* 더 불러오기 스피너 */}
            {loadingHistory && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#E07535', animation: 'spin 0.7s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}

            {/* 메시지 없음 */}
            {messages.length === 0 && !loadingHistory && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p style={{ fontSize: 14, margin: 0 }}>아직 메시지가 없습니다.</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>첫 번째 메시지를 보내보세요!</p>
              </div>
            )}

            {/* 메시지 목록 */}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user?.id
              const prev = messages[i - 1]
              const showDate = !prev || !isSameDay(prev.created_at, msg.created_at)
              const showAvatar = !prev
                || prev.sender_id !== msg.sender_id
                || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 60_000
              const sysAfterPrev = systemMessages.filter((_, si) => si === i)
              // 내가 이 세션에서 보낸 메시지: 미읽음 추정 수 = 나 제외 전체 멤버
              const unreadCount = isMine && sessionMsgIds.has(msg.id) && memberCount > 1
                ? memberCount - 1
                : undefined

              return (
                <div key={msg.id}>
                  {showDate && <DateDivider dateStr={formatDate(msg.created_at)} />}
                  {sysAfterPrev.map(s => <SystemLine key={s.key} content={s.content} />)}
                  <MessageBubble
                    msg={msg}
                    isMine={isMine}
                    showAvatar={showAvatar}
                    isAnimating={animatingMsgIds.has(msg.id)}
                    animOriginY={animOriginYRef.current}
                    onAnimDone={animatingMsgIds.has(msg.id) ? () => clearAnimation(msg.id) : undefined}
                    onFullView={() => setFullViewMsg(msg)}
                    unreadCount={unreadCount}
                  />
                </div>
              )
            })}

            {systemMessages.slice(messages.length).map(s => (
              <SystemLine key={s.key} content={s.content} />
            ))}
            <div ref={bottomRef} style={{ height: 16 }} />
          </div>

          {/* ── 멤버 사이드바 ────────────────────────────────────────────── */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 210, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden', background: '#ffffff', borderLeft: '1px solid #e5e5ea', flexShrink: 0 }}
              >
                <div style={{ padding: '16px 14px', minWidth: 210, overflowY: 'auto', maxHeight: '100%' }}>

                  {/* 공지 섹션 */}
                  <SidebarNoticeSection
                    noticeText={noticeText}
                    isLeader={isLeader}
                    onEdit={() => setEditingNotice(true)}
                    onDelete={() => saveNotice('')}
                    onFullView={() => setNoticeFullView(true)}
                  />

                  {/* 멤버 섹션 */}
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    멤버 ({roomInfo?.members.length ?? 0})
                  </p>
                  {roomInfo?.members.map(m => (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(m.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {avatarInitial(m.nickname)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.nickname}
                          {m.user_id === user?.id && <span style={{ fontSize: 10, color: '#aeaeb2', marginLeft: 4 }}>나</span>}
                        </div>
                        {m.is_leader && <div style={{ fontSize: 10, color: '#E07535', fontWeight: 600 }}>조장</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 입력창 ───────────────────────────────────────────────────────── */}
      <div ref={inputBarRef} style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #e5e5ea', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={wsState === 'open' ? '메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)' : '연결 중...'}
            disabled={wsState !== 'open'}
            rows={1}
            style={{
              flex: 1, background: wsState === 'open' ? '#f5f5f7' : 'rgba(245,245,247,0.5)',
              border: '1px solid transparent', borderRadius: 20, padding: '10px 16px',
              fontSize: 14, color: '#1d1d1f', resize: 'none', outline: 'none',
              lineHeight: 1.5, fontFamily: FONT, maxHeight: 120, overflowY: 'auto',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(224,117,53,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'transparent')}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || wsState !== 'open' || isBubbleAnimating}
            whileHover={input.trim() && wsState === 'open' && !isBubbleAnimating ? { scale: 1.08 } : {}}
            whileTap={input.trim() && wsState === 'open' && !isBubbleAnimating ? { scale: 0.92 } : {}}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: isBubbleAnimating ? '#E07535' : input.trim() && wsState === 'open' ? '#E07535' : 'rgba(224,117,53,0.25)',
              border: 'none', cursor: input.trim() && wsState === 'open' && !isBubbleAnimating ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0, transition: 'background 0.2s',
              opacity: isBubbleAnimating ? 0.75 : 1,
            }}
          >
            {isBubbleAnimating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#ffffff', flexShrink: 0 }}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── 오버레이 모달들 ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {fullViewMsg && (
          <MessageFullViewModal
            key="msg-full"
            msg={fullViewMsg}
            isMine={fullViewMsg.sender_id === user?.id}
            onClose={() => setFullViewMsg(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {noticeFullView && noticeText.trim() && (
          <NoticeFullViewModal
            key="notice-full"
            notice={noticeText}
            onClose={() => setNoticeFullView(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingNotice && (
          <NoticeEditModal
            key="notice-edit"
            initial={noticeText}
            onSave={saveNotice}
            onCancel={() => setEditingNotice(false)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
