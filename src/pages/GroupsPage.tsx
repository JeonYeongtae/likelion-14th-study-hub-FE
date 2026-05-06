/**
 * GroupsPage.tsx
 *
 * GET  /api/v1/groups/   (모집 글 전체 목록 — 비로그인 허용)
 * POST /api/v1/groups/   (모집 글 생성 — 로그인 필요)
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import StyledRangeSlider from '../components/StyledRangeSlider'
import type { StudyGroupResponse, MyApplicationResponse } from '../types/api'
import CategorySelector from '../components/liquid-glass/CategorySelector'

// ─── 상태 배지 색상 ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  '모집중':   { bg: 'rgba(52,199,89,0.08)',   border: 'rgba(52,199,89,0.2)',  text: '#34C759',  label: '모집 중' },
  '모집완료': { bg: 'rgba(255,149,0,0.08)',    border: 'rgba(255,149,0,0.2)',  text: '#FF9500',  label: '정원 마감' },
  '종료':     { bg: 'rgba(255,59,48,0.08)',    border: 'rgba(255,59,48,0.15)', text: '#ff3b30',  label: '모집 종료' },
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  group, index, isOwn, appStatus,
}: {
  group: StudyGroupResponse
  index: number
  isOwn: boolean
  appStatus: 'pending' | 'accepted' | null
}) {
  const navigate = useNavigate()
  const s = STATUS_STYLE[group.status] ?? STATUS_STYLE['모집중']
  const pct = Math.round((group.current_members / group.max_members) * 100)

  const baseBorder = isOwn ? 'rgba(0,113,227,0.35)' : '#e5e5ea'
  const hoverBorder = isOwn ? 'rgba(0,113,227,0.6)' : '#d2d2d7'
  const hoverShadow = isOwn
    ? '0 4px 20px rgba(0,113,227,0.12)'
    : '0 4px 20px rgba(0,0,0,0.07)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/groups/${group.id}`)}
      style={{
        background: '#ffffff',
        border: `1px solid ${baseBorder}`,
        borderRadius: 20,
        padding: '24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        minHeight: 220,
      }}
      whileHover={{ y: -3 }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = hoverBorder
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = hoverShadow
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = baseBorder
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 100, height: 100,
        background: isOwn
          ? 'radial-gradient(circle at top right, rgba(0,113,227,0.08), transparent 70%)'
          : 'radial-gradient(circle at top right, rgba(0,113,227,0.04), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 상태 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 6 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          background: s.bg, border: `1px solid ${s.border}`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: s.text }}>{s.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOwn && (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.3)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0071E3' }}>내 그룹</span>
            </div>
          )}
          {appStatus === 'pending' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(0,113,227,0.07)', border: '1px solid rgba(0,113,227,0.2)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0071E3' }}>신청 중</span>
            </div>
          )}
          {appStatus === 'accepted' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#34C759' }}>가입됨</span>
            </div>
          )}
        </div>
      </div>

      {/* 제목 */}
      <h3 style={{
        fontSize: 16, fontWeight: 700, color: '#1d1d1f',
        letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {group.title}
      </h3>

      {/* 설명 */}
      {group.description && (
        <p style={{
          fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: 16,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {group.description}
        </p>
      )}

      {/* 인원 프로그레스 */}
      <div style={{ marginBottom: 12, marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#aeaeb2' }}>멤버</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73' }}>
            {group.current_members} / {group.max_members}명
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: '#e5e5ea' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${pct}%`,
            background: pct >= 100 ? '#005BBB' : pct >= 70 ? '#3395F5' : '#0071E3',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* 날짜 */}
      <div style={{ fontSize: 11, color: '#aeaeb2' }}>
        {new Date(group.created_at).toLocaleDateString('ko-KR')} 개설
      </div>
    </motion.div>
  )
}

// ─── CreateModal ──────────────────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

type ModalAnimItem = { dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }

function CreateModal({
  item,
  onClose,
  onSuccess,
}: {
  item: ModalAnimItem
  onClose: () => void
  onSuccess: () => void
}) {
  const { showAlert } = useAlert()
  const [form, setForm] = useState({ title: '', description: '', max_members: 4 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/groups/', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        max_members: form.max_members,
      })
      if (!res.ok) {
        showAlert('그룹 생성에 실패했습니다.', 'error')
        return
      }
      onSuccess()
    } catch {
      showAlert('네트워크 오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: FONT,
      }}
    >
      <motion.div
        initial={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8 }}
        animate={{ width: item.toW, height: item.toH, x: 0, y: 0, borderRadius: 20 }}
        exit={{ width: item.fromW, height: item.fromH, x: item.dx, y: item.dy, borderRadius: 8, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
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
        <motion.div
          initial={{ opacity: 0.3, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.38, delay: 0.06, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
          {/* 헤더 */}
          <div style={{
            position: 'relative',
            padding: '26px 26px 22px',
            background: 'linear-gradient(145deg, rgba(0,113,227,0.11) 0%, rgba(0,113,227,0.04) 60%, rgba(255,255,255,0) 100%)',
            borderBottom: '1px solid rgba(0,113,227,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #0071E3, #4DA3FF)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0071E3', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Groups</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', margin: '0 0 4px' }}>
                  스터디 그룹 만들기
                </h2>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>함께 공부할 그룹을 개설하세요</span>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 1, padding: '24px 26px', background: 'rgba(248, 248, 250, 0.5)', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {/* 그룹 이름 */}
              <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '14px 18px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)' }}>
                <input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="그룹 이름을 입력하세요"
                  maxLength={60}
                  autoFocus
                  style={{
                    width: '100%', border: 'none', padding: 0,
                    fontSize: 15, fontWeight: 600, color: '#1d1d1f',
                    outline: 'none', fontFamily: FONT, background: 'transparent',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 그룹 소개 */}
              <div style={{ flex: 1, position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '14px 18px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="그룹 소개를 입력하세요 (선택)"
                  style={{
                    flex: 1,
                    width: '100%', border: 'none', padding: 0,
                    fontSize: 14, color: '#1d1d1f', lineHeight: 1.9,
                    outline: 'none', resize: 'none', fontFamily: FONT,
                    background: 'transparent', boxSizing: 'border-box',
                    wordBreak: 'break-word', overflowY: 'auto',
                  }}
                />
              </div>

              {/* 최대 인원 */}
              <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '14px 18px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#6e6e73', fontWeight: 500 }}>최대 인원</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0071E3' }}>{form.max_members}명</span>
                </div>
                <StyledRangeSlider
                  min={2}
                  max={20}
                  value={form.max_members}
                  onChange={(v) => setForm(f => ({ ...f, max_members: v }))}
                />
              </div>
            </div>

            {/* 푸터 */}
            <div style={{ padding: '14px 26px', borderTop: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                className="liquid"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', color: '#6e6e73', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: FONT }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !form.title.trim()}
                className="liquid liquid-action"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em', fontFamily: FONT, opacity: loading || !form.title.trim() ? 0.4 : 1 }}
              >
                {loading ? '생성 중...' : '그룹 만들기'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ─── GroupsPage ───────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { isLoggedIn, user } = useAuth()
  const [groups, setGroups] = useState<StudyGroupResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [createItem, setCreateItem] = useState<ModalAnimItem | null>(null)
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'mine' | 'applied'>('all')
  const [appMap, setAppMap] = useState<Map<number, 'pending' | 'accepted'>>(new Map())

  const fetchGroups = () => {
    fetch('/api/v1/groups/')
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGroups() }, [])

  useEffect(() => {
    if (!isLoggedIn) { setAppMap(new Map()); setFilter(f => (f === 'mine' || f === 'applied') ? 'all' : f); return }
    api.get('/my/applications').then(async r => {
      if (!r.ok) return
      const apps: MyApplicationResponse[] = await r.json()
      const m = new Map<number, 'pending' | 'accepted'>()
      for (const a of apps) {
        if (a.status === 'pending' || a.status === 'accepted') {
          m.set(a.group_id, a.status)
        }
      }
      setAppMap(m)
    })
  }, [isLoggedIn])

  const displayed =
    filter === 'recruiting' ? groups.filter(g => g.status === '모집중') :
    filter === 'mine'       ? groups.filter(g => !!user && g.leader_id === user.id) :
    filter === 'applied'    ? groups.filter(g => appMap.has(g.id)) :
    groups

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
          style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#0071E3' }}>
            Study Groups
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '8px 0 0' }}>
            스터디 그룹
          </h1>
        </motion.div>

        {/* 필터 + 생성 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <CategorySelector
            theme="light"
            selected={filter}
            onSelect={(id) => setFilter(id as typeof filter)}
            categories={([
              { key: 'all',        label: '전체',        count: groups.length,                                               loginRequired: false },
              { key: 'recruiting', label: '모집 중',      count: groups.filter(g => g.status === '모집중').length,             loginRequired: false },
              { key: 'mine',       label: '내 그룹',      count: groups.filter(g => !!user && g.leader_id === user.id).length, loginRequired: true  },
              { key: 'applied',    label: '신청한 그룹',   count: appMap.size,                                                 loginRequired: true  },
            ] as const)
              .filter(f => !f.loginRequired || isLoggedIn)
              .map(f => ({ id: f.key, label: f.label, badge: f.count }))}
          />

          {isLoggedIn && (
            <motion.button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                const toW = Math.min(window.innerWidth - 32, 640)
                const toH = window.innerHeight - 80 * 2
                setCreateItem({
                  dx: (rect.left + rect.width / 2) - window.innerWidth / 2,
                  dy: (rect.top + rect.height / 2) - window.innerHeight / 2,
                  fromW: rect.width,
                  fromH: rect.height,
                  toW,
                  toH,
                })
              }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="liquid liquid-action"
              style={{ padding: '10px 20px', borderRadius: 22, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              + 그룹 만들기
            </motion.button>
          )}
        </div>

        {/* 목록 */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 180, borderRadius: 20, background: '#e5e5ea', border: '1px solid #d2d2d7', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: 14 }}>
            {filter === 'recruiting' ? '모집 중인 그룹이 없습니다.' : '아직 그룹이 없습니다.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {displayed.map((g, i) => (
            <GroupCard
              key={g.id}
              group={g}
              index={i}
              isOwn={!!user && g.leader_id === user.id}
              appStatus={appMap.get(g.id) ?? null}
            />
          ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {createItem && (
          <CreateModal
            item={createItem}
            onClose={() => setCreateItem(null)}
            onSuccess={() => { setCreateItem(null); fetchGroups() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
