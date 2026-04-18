/**
 * RoomsPage.tsx
 *
 * GET /api/v1/rooms/
 * - 스터디룸 전체 목록 (로그인 불필요)
 * - 각 카드 클릭 → /rooms/:id 예약 페이지
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { RoomResponse } from '../types/api'

// ─── 수용 인원 표시 ───────────────────────────────────────────────────────────

function CapacityDots({ capacity }: { capacity: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: Math.min(capacity, 10) }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < capacity ? 'rgba(224,117,53,0.6)' : '#e5e5ea',
        }} />
      ))}
      {capacity > 10 && (
        <span style={{ fontSize: 10, color: '#aeaeb2', marginLeft: 2 }}>+{capacity - 10}</span>
      )}
    </div>
  )
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({ room, index }: { room: RoomResponse; index: number }) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => room.is_available && navigate(`/rooms/${room.id}`)}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5ea',
        borderRadius: 20,
        padding: '28px',
        cursor: room.is_available ? 'pointer' : 'default',
        opacity: room.is_available ? 1 : 0.55,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={room.is_available ? { y: -4 } : {}}
      onMouseEnter={(e) => {
        if (!room.is_available) return
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#d2d2d7'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#e5e5ea'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* 배경 그라디언트 */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        background: room.is_available
          ? 'radial-gradient(circle at top right, rgba(224,117,53,0.05), transparent 70%)'
          : 'transparent',
        pointerEvents: 'none',
      }} />

      {/* 상태 배지 */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999, marginBottom: 16,
        background: room.is_available ? 'rgba(52,199,89,0.08)' : 'rgba(255,69,58,0.08)',
        border: `1px solid ${room.is_available ? 'rgba(52,199,89,0.2)' : 'rgba(255,69,58,0.2)'}`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: room.is_available ? '#34C759' : '#FF453A',
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
          color: room.is_available ? '#34C759' : '#FF453A',
        }}>
          {room.is_available ? '이용 가능' : '이용 불가'}
        </span>
      </div>

      {/* 이름 */}
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: '#1d1d1f',
        letterSpacing: '-0.02em', marginBottom: 8,
      }}>
        {room.name}
      </h3>

      {/* 설명 */}
      {room.description && (
        <p style={{
          fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: 16,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {room.description}
        </p>
      )}

      {/* 수용 인원 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        <span style={{ fontSize: 12, color: '#aeaeb2' }}>수용 인원</span>
        <CapacityDots capacity={room.capacity} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73' }}>
          {room.capacity}명
        </span>
      </div>

      {/* 예약하기 화살표 */}
      {room.is_available && (
        <div style={{
          position: 'absolute', bottom: 28, right: 28,
          fontSize: 18, color: 'rgba(224,117,53,0.5)',
        }}>
          →
        </div>
      )}
    </motion.div>
  )
}

// ─── RoomsPage ────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/rooms/')
      .then(r => r.ok ? r.json() : [])
      .then(setRooms)
      .finally(() => setLoading(false))
  }, [])

  const available = rooms.filter(r => r.is_available)
  const unavailable = rooms.filter(r => !r.is_available)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E07535' }}>
            Study Rooms
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '8px 0 8px' }}>
            스터디룸
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
            원하는 룸을 선택해 예약하세요. 로그인 없이도 현황을 확인할 수 있습니다.
          </p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 180, borderRadius: 20,
                background: '#e5e5ea',
                border: '1px solid #d2d2d7',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: 14 }}>
            등록된 스터디룸이 없습니다.
          </div>
        ) : (
          <>
            {/* 이용 가능 */}
            {available.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34C759' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    이용 가능 ({available.length})
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {available.map((room, i) => <RoomCard key={room.id} room={room} index={i} />)}
                </div>
              </div>
            )}

            {/* 이용 불가 */}
            {unavailable.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF453A' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    이용 불가 ({unavailable.length})
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {unavailable.map((room, i) => <RoomCard key={room.id} room={room} index={i + available.length} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
