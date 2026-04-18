/**
 * RoomDetailPage.tsx
 *
 * GET  /api/v1/rooms/{id}             (목록에서 find로 처리 — 별도 엔드포인트 없음)
 * GET  /api/v1/reservations/room/{id} (예약 현황)
 * POST /api/v1/reservations/          (예약 생성)
 * DELETE /api/v1/reservations/{id}   (예약 취소)
 *
 * UI: 날짜 선택 → 해당 날짜의 타임슬롯 렌더링 → 시간 범위 선택 → 예약
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { RoomResponse, ReservationResponse } from '../types/api'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const SLOT_HOUR = 1  // 1시간 단위 슬롯 (서버 설정에 따라 RoomSettings로 동적 처리 가능)
const DEFAULT_OPEN  = 9
const DEFAULT_CLOSE = 22

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toKSTIso(dateStr: string, hour: number) {
  // 'YYYY-MM-DD' + hour → KST ISO (UTC+9)
  return `${dateStr}T${String(hour).padStart(2, '0')}:00:00+09:00`
}

function slotLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${String(h).padStart(2, '0')}:00 ${ampm}`
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date()
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
      {dates.map(d => {
        const str = toDateStr(d)
        const active = str === value
        const isToday = str === toDateStr(today)
        return (
          <motion.button
            key={str}
            onClick={() => onChange(str)}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
            style={{
              minWidth: 56, flexShrink: 0,
              padding: '10px 6px', borderRadius: 12,
              background: active ? '#E07535' : '#ffffff',
              border: `1px solid ${active ? '#E07535' : '#d2d2d7'}`,
              color: active ? '#fff' : '#1d1d1f',
              cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
              boxShadow: active ? '0 2px 8px rgba(224,117,53,0.25)' : 'none',
            }}>
            <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 4, opacity: 0.7 }}>
              {['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}
            </div>
            <div style={{ fontSize: 16, fontWeight: active ? 700 : 500 }}>
              {d.getDate()}
            </div>
            {isToday && (
              <div style={{ fontSize: 9, marginTop: 2, color: active ? 'rgba(255,255,255,0.8)' : '#E07535', fontWeight: 600 }}>
                TODAY
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── TimeSlotGrid ─────────────────────────────────────────────────────────────

type SlotState = 'available' | 'taken' | 'mine' | 'selected' | 'past'

function TimeSlotGrid({
  openHour, closeHour,
  reservations, selectedDate,
  myUserId, selectedSlots,
  onToggle,
}: {
  openHour: number
  closeHour: number
  reservations: ReservationResponse[]
  selectedDate: string
  myUserId: number | undefined
  selectedSlots: number[]
  onToggle: (hour: number) => void
}) {
  const now = new Date()

  function slotState(hour: number): SlotState {
    const slotStart = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00+09:00`)
    if (slotStart <= now) return 'past'

    const taken = reservations.find(r => {
      const s = new Date(r.start_time).getHours()
      const e = new Date(r.end_time).getHours()
      return s <= hour && hour < e
    })
    if (taken) return taken.user_id === myUserId ? 'mine' : 'taken'
    if (selectedSlots.includes(hour)) return 'selected'
    return 'available'
  }

  const slots = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
      {slots.map(hour => {
        const state = slotState(hour)
        const colors: Record<SlotState, { bg: string; border: string; text: string }> = {
          available: { bg: '#ffffff',                   border: '#d2d2d7',                text: '#1d1d1f' },
          taken:     { bg: 'rgba(255,59,48,0.06)',      border: 'rgba(255,59,48,0.2)',    text: '#ff3b30' },
          mine:      { bg: 'rgba(52,199,89,0.08)',      border: 'rgba(52,199,89,0.25)',   text: '#34C759' },
          selected:  { bg: 'rgba(224,117,53,0.1)',      border: '#E07535',                text: '#E07535' },
          past:      { bg: '#f5f5f7',                   border: '#e5e5ea',                text: '#aeaeb2' },
        }
        const c = colors[state]
        return (
          <motion.button
            key={hour}
            onClick={() => (state === 'available' || state === 'selected') && onToggle(hour)}
            whileHover={state === 'available' || state === 'selected' ? { scale: 1.03 } : {}}
            whileTap={state === 'available' || state === 'selected' ? { scale: 0.97 } : {}}
            style={{
              padding: '10px 4px', borderRadius: 10, textAlign: 'center',
              background: c.bg, border: `1px solid ${c.border}`, color: c.text,
              cursor: state === 'available' || state === 'selected' ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{slotLabel(hour)}</div>
            <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>
              {state === 'taken' ? '예약됨' : state === 'mine' ? '내 예약' : state === 'past' ? '지남' : state === 'selected' ? '선택됨' : '가능'}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── RoomDetailPage ───────────────────────────────────────────────────────────

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const roomId = Number(id)

  const [room, setRoom] = useState<RoomResponse | null>(null)
  const [reservations, setReservations] = useState<ReservationResponse[]>([])
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [selectedSlots, setSelectedSlots] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchRoom = useCallback(async () => {
    const res = await fetch('/api/v1/rooms/')
    if (res.ok) {
      const rooms: RoomResponse[] = await res.json()
      const found = rooms.find(r => r.id === roomId)
      setRoom(found ?? null)
    }
  }, [roomId])

  const fetchReservations = useCallback(async () => {
    const res = await fetch(`/api/v1/reservations/room/${roomId}`)
    if (res.ok) setReservations(await res.json())
  }, [roomId])

  useEffect(() => {
    Promise.all([fetchRoom(), fetchReservations()]).finally(() => setLoading(false))
  }, [fetchRoom, fetchReservations])

  // 날짜 바뀌면 선택 초기화
  useEffect(() => setSelectedSlots([]), [selectedDate])

  const toggleSlot = (hour: number) => {
    setSelectedSlots(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    )
  }

  const handleReserve = async () => {
    if (!isLoggedIn) { navigate('/auth'); return }
    if (selectedSlots.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const startHour = Math.min(...selectedSlots)
      const endHour   = Math.max(...selectedSlots) + SLOT_HOUR
      const res = await api.post('/reservations/', {
        room_id: roomId,
        start_time: toKSTIso(selectedDate, startHour),
        end_time:   toKSTIso(selectedDate, endHour),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail ?? '예약에 실패했습니다.')
        return
      }
      setSuccess(true)
      setSelectedSlots([])
      fetchReservations()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 해당 날짜의 예약만 필터
  const dayReservations = reservations.filter(r => {
    const d = new Date(r.start_time)
    return toDateStr(d) === selectedDate
  })

  const myReservations = reservations.filter(r => r.user_id === user?.id)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#E07535', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6e6e73' }}>
          <p style={{ marginBottom: 16 }}>룸을 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/rooms')} style={{ color: '#E07535', background: 'none', border: 'none', cursor: 'pointer' }}>
            목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 뒤로가기 */}
        <button onClick={() => navigate('/rooms')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 28, fontFamily: 'inherit' }}>
          ← 스터디룸 목록
        </button>

        {/* 룸 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e5ea',
            borderRadius: 20,
            padding: '28px',
            marginBottom: 24,
          }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                {room.name}
              </h1>
              {room.description && (
                <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>{room.description}</p>
              )}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              background: '#f5f5f7', border: '1px solid #e5e5ea',
              fontSize: 13, color: '#6e6e73',
            }}>
              👥 최대 {room.capacity}명
            </div>
          </div>
        </motion.div>

        {/* 날짜 선택 */}
        <section style={{
          background: '#ffffff',
          border: '1px solid #e5e5ea',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
            날짜 선택
          </h2>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </section>

        {/* 타임슬롯 */}
        <section style={{
          background: '#ffffff',
          border: '1px solid #e5e5ea',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
              시간 선택
            </h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#aeaeb2' }}>
              <span>■ <span style={{ color: '#1d1d1f' }}>가능</span></span>
              <span style={{ color: '#ff3b30' }}>■ 예약됨</span>
              <span style={{ color: '#34C759' }}>■ 내 예약</span>
              <span style={{ color: '#E07535' }}>■ 선택됨</span>
            </div>
          </div>
          <TimeSlotGrid
            openHour={DEFAULT_OPEN}
            closeHour={DEFAULT_CLOSE}
            reservations={dayReservations}
            selectedDate={selectedDate}
            myUserId={user?.id}
            selectedSlots={selectedSlots}
            onToggle={toggleSlot}
          />
        </section>

        {/* 예약 요약 + 버튼 */}
        <AnimatePresence>
          {selectedSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                background: 'rgba(224,117,53,0.06)',
                border: '1px solid rgba(224,117,53,0.2)',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 4px' }}>예약 시간</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                  {selectedDate} {slotLabel(Math.min(...selectedSlots))} ~ {slotLabel(Math.max(...selectedSlots) + SLOT_HOUR)}
                </p>
              </div>
              <motion.button
                onClick={handleReserve}
                disabled={submitting}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: submitting ? 'rgba(224,117,53,0.4)' : '#E07535',
                  color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  letterSpacing: '-0.01em', fontFamily: 'inherit',
                }}>
                {submitting ? '예약 중...' : isLoggedIn ? '예약하기' : '로그인 후 예약'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)', fontSize: 13, color: '#ff3b30', marginBottom: 16 }}>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onAnimationComplete={() => setTimeout(() => setSuccess(false), 3000)}
              style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', fontSize: 13, color: '#34C759', marginBottom: 16 }}>
              예약이 완료되었습니다!
            </motion.div>
          )}
        </AnimatePresence>

        {/* 내 예약 목록 */}
        {myReservations.length > 0 && (
          <section style={{
            background: '#ffffff',
            border: '1px solid #e5e5ea',
            borderRadius: 20,
            padding: '24px 28px',
            marginTop: 16,
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
              내 예약
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myReservations.map(r => {
                const start = new Date(r.start_time)
                const end   = new Date(r.end_time)
                const isFuture = end > new Date()
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(52,199,89,0.05)', border: '1px solid rgba(52,199,89,0.15)',
                    flexWrap: 'wrap', gap: 8,
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        {toDateStr(start)}{' '}
                        {String(start.getHours()).padStart(2, '0')}:00 ~ {String(end.getHours()).padStart(2, '0')}:00
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: r.status === 'confirmed' ? '#34C759' : '#aeaeb2' }}>
                        {r.status}
                      </span>
                    </div>
                    {isFuture && (
                      <button
                        onClick={async () => {
                          if (!confirm('예약을 취소하시겠습니까?')) return
                          await api.delete(`/reservations/${r.id}`)
                          fetchReservations()
                        }}
                        style={{ fontSize: 12, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        취소
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
