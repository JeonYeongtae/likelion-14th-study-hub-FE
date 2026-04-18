/**
 * GroupsPage.tsx
 *
 * GET  /api/v1/groups/   (모집 글 전체 목록 — 비로그인 허용)
 * POST /api/v1/groups/   (모집 글 생성 — 로그인 필요)
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import StyledRangeSlider from '../components/StyledRangeSlider'
import type { StudyGroupResponse } from '../types/api'

// ─── 상태 배지 색상 ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  '모집중':   { bg: 'rgba(52,199,89,0.08)',   border: 'rgba(52,199,89,0.2)',  text: '#34C759',  label: '모집 중' },
  '모집완료': { bg: 'rgba(255,149,0,0.08)',    border: 'rgba(255,149,0,0.2)',  text: '#FF9500',  label: '정원 마감' },
  '종료':     { bg: 'rgba(255,59,48,0.08)',    border: 'rgba(255,59,48,0.15)', text: '#ff3b30',  label: '모집 종료' },
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({ group, index }: { group: StudyGroupResponse; index: number }) {
  const navigate = useNavigate()
  const s = STATUS_STYLE[group.status] ?? STATUS_STYLE['모집중']
  const pct = Math.round((group.current_members / group.max_members) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/groups/${group.id}`)}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5ea',
        borderRadius: 20,
        padding: '24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative', overflow: 'hidden',
      }}
      whileHover={{ y: -3 }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#d2d2d7'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#e5e5ea'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 100, height: 100,
        background: 'radial-gradient(circle at top right, rgba(224,117,53,0.04), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 상태 배지 */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 999, marginBottom: 12,
        background: s.bg, border: `1px solid ${s.border}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: s.text }}>{s.label}</span>
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
      <div style={{ marginBottom: 12 }}>
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
            background: pct >= 100 ? '#FF9500' : pct >= 70 ? '#FF9F0A' : '#E07535',
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

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { showAlert } = useAlert()
  const [form, setForm] = useState({ title: '', description: '', max_members: 4 })
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
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
    <motion.div ref={overlayRef}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 520,
          background: '#ffffff', border: '1px solid #e5e5ea',
          borderRadius: 20, padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>
            스터디 그룹 모집
          </h2>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
            style={{ background: 'none', border: 'none', color: '#aeaeb2', cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1 }}>
            ×
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="그룹 이름" maxLength={60} autoFocus
            style={{ background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 10, padding: '12px 16px', fontSize: 15, fontWeight: 600, color: '#1d1d1f', outline: 'none', fontFamily: 'inherit' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')} />

          <textarea value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="그룹 소개 (선택)" rows={4}
            style={{ background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#1d1d1f', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')} />

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6e6e73', marginBottom: 4 }}>
              최대 인원 : <strong style={{ color: '#1d1d1f' }}>{form.max_members}명</strong>
            </label>
            <StyledRangeSlider
              min={2}
              max={20}
              value={form.max_members}
              onChange={(v) => setForm(f => ({ ...f, max_members: v }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <motion.button type="button" onClick={onClose}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, background: '#f5f5f7', border: '1px solid #d2d2d7', color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit' }}>
              취소
            </motion.button>
            <motion.button type="submit"
              disabled={loading || !form.title.trim()}
              whileHover={!loading && form.title.trim() ? { scale: 1.03 } : {}}
              whileTap={!loading && form.title.trim() ? { scale: 0.96 } : {}}
              style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: loading || !form.title.trim() ? 'rgba(224,117,53,0.3)' : '#E07535', color: '#fff', border: 'none', cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
              {loading ? '생성 중...' : '그룹 만들기'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── GroupsPage ───────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { isLoggedIn } = useAuth()
  const [groups, setGroups] = useState<StudyGroupResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'recruiting'>('all')

  const fetchGroups = () => {
    fetch('/api/v1/groups/')
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGroups() }, [])

  const displayed = filter === 'recruiting'
    ? groups.filter(g => g.status === '모집중')
    : groups

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
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E07535' }}>
            Study Groups
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '8px 0 0' }}>
            스터디 그룹
          </h1>
        </motion.div>

        {/* 필터 + 생성 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'recruiting'] as const).map(f => (
              <motion.button key={f} onClick={() => setFilter(f)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                style={{
                  padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  background: filter === f ? '#E07535' : '#f2f2f7',
                  border: `1px solid ${filter === f ? '#E07535' : '#d2d2d7'}`,
                  color: filter === f ? '#fff' : '#6e6e73',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.18s, border-color 0.18s, color 0.18s',
                }}>
                {f === 'all' ? '전체' : '모집 중'}
              </motion.button>
            ))}
          </div>

          {isLoggedIn && (
            <motion.button onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ padding: '9px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#E07535', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
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
            {displayed.map((g, i) => <GroupCard key={g.id} group={g} index={i} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onSuccess={() => { setShowCreate(false); fetchGroups() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
