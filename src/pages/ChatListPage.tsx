/**
 * ChatListPage.tsx
 *
 * 내가 속한 채팅방 목록 페이지
 * - 접근: 로그인 필수 (App.tsx에서 ProtectedRoute 처리)
 * - 데이터: GET /api/v1/my/chats — 확정(종료) 상태 그룹 채팅방만 반환
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ChatRoomListItem } from '../types/api'

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
}: {
  room: ChatRoomListItem
  onClick: () => void
  index: number
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e5e5ea',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'visible',
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
        position: 'relative',
      }}>
        {avatarInitial(room.group_title)}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 1열: 그룹명 · 조장 뱃지 · 멤버 수 | 최근 메시지 시각 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
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
                fontSize: 10, fontWeight: 600, color: '#E07535',
                background: 'rgba(224,117,53,0.08)',
                border: '1px solid rgba(224,117,53,0.2)',
                borderRadius: 999, padding: '1px 6px', flexShrink: 0,
              }}>
                조장
              </span>
            )}
            <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0, whiteSpace: 'nowrap' }}>
              멤버 {room.member_count}명
            </span>
          </div>
          {/* 최근 메시지 시각 — 항상 렌더, 데이터 없으면 빈 문자열 */}
          <span style={{ fontSize: 11, color: '#aeaeb2', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {room.last_message_at ? formatChatTime(room.last_message_at) : ''}
          </span>
        </div>

        {/* 2열: 최근 메시지 미리보기 | 안읽은 메시지 뱃지 */}
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

// ─── ChatListPage ──────────────────────────────────────────────────────────────

export default function ChatListPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<ChatRoomListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/my/chats')
      .then(async res => {
        if (res.ok) setRooms(await res.json())
      })
      .finally(() => setLoading(false))
  }, [])

  const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 32 }}
        >
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.04em',
            margin: '0 0 6px',
          }}>
            채팅
          </h1>
          <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>
            확정된 스터디 그룹의 채팅방입니다.
          </p>
        </motion.div>

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

        {/* 채팅방 없음 */}
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
            <div style={{ fontSize: 52, marginBottom: 4 }}>💬</div>
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
                background: '#E07535',
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

        {/* 채팅방 목록 — last_message_at 기준 내림차순 정렬 */}
        {!loading && rooms.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...rooms]
              .sort((a, b) => {
                if (!a.last_message_at && !b.last_message_at) return 0
                if (!a.last_message_at) return 1
                if (!b.last_message_at) return -1
                return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
              })
              .map((room, i) => (
                <ChatRoomCard
                  key={room.group_id}
                  room={room}
                  index={i}
                  onClick={() => navigate(`/groups/${room.group_id}/chat`, { state: { from: '/chats' } })}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
