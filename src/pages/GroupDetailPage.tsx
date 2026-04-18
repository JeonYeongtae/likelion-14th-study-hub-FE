/**
 * GroupDetailPage.tsx
 *
 * GET   /api/v1/groups/{id}                   (상세 — 조장은 applications 포함)
 * POST  /api/v1/groups/{id}/apply             (스터디 신청)
 * PATCH /api/v1/groups/applications/{app_id}  (신청 수락/거절 — 조장)
 * PATCH /api/v1/groups/{id}                   (그룹 수정 — 조장)
 * DELETE /api/v1/groups/{id}                  (그룹 삭제 — 조장)
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import StyledRangeSlider from '../components/StyledRangeSlider'
import type { StudyGroupDetailResponse, ApplicationSummary, ApplicationResponse } from '../types/api'

// ─── 상태 레이블 ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  '모집중':   '모집 중',
  '모집완료': '정원 마감',
  '종료':     '모집 종료',
}

const APP_STATUS_STYLE: Record<string, { color: string; label: string }> = {
  pending:  { color: '#FF9500',   label: '검토 중' },
  accepted: { color: '#34C759',   label: '승인됨' },
  rejected: { color: '#ff3b30',   label: '거절됨' },
}

// ─── ApplicationRow ───────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  onProcess,
}: {
  app: ApplicationSummary
  onProcess: (id: number, status: 'accepted' | 'rejected') => void
}) {
  const s = APP_STATUS_STYLE[app.status] ?? APP_STATUS_STYLE.pending

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: 12,
      background: '#ffffff', border: '1px solid #e5e5ea',
      flexWrap: 'wrap', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `hsl(${(app.applicant_id * 37) % 360}, 50%, 55%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {app.applicant_id}
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
            user_{app.applicant_id}
          </span>
          {app.message && (
            <p style={{ fontSize: 12, color: '#6e6e73', margin: '2px 0 0', lineHeight: 1.5 }}>
              "{app.message}"
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
        {app.status === 'pending' && (
          <>
            <motion.button
              onClick={() => onProcess(app.id, 'accepted')}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', color: '#34C759', cursor: 'pointer' }}>
              수락
            </motion.button>
            <motion.button
              onClick={() => onProcess(app.id, 'rejected')}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)', color: '#ff3b30', cursor: 'pointer' }}>
              거절
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── GroupDetailPage ──────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showConfirm, showAlert } = useAlert()
  const groupId = Number(id)

  const [group, setGroup] = useState<StudyGroupDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  // undefined = 로딩 중, null = 신청 내역 없음, ApplicationResponse = 신청 내역 있음
  const [myApplication, setMyApplication] = useState<ApplicationResponse | null | undefined>(undefined)
  const [showReapplyForm, setShowReapplyForm] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', max_members: 4 })
  const [confirmingFull, setConfirmingFull] = useState(false)

  const fetchGroup = useCallback(async () => {
    const res = await api.get(`/groups/${groupId}`)
    if (res.ok) {
      const g = await res.json()
      setGroup(g)
      setEditForm({ title: g.title, description: g.description ?? '', max_members: g.max_members })
    }
  }, [groupId])

  useEffect(() => {
    fetchGroup().finally(() => setLoading(false))
  }, [fetchGroup])

  // 그룹 로드 후 — 로그인된 비조장 유저의 신청 현황 fetch
  useEffect(() => {
    if (!group) return
    if (!isLoggedIn || group.leader_id === user?.id) {
      setMyApplication(null)
      return
    }
    api.get(`/groups/${groupId}/my-application`).then(async res => {
      setMyApplication(res.ok ? await res.json() : null)
    })
  }, [group, isLoggedIn, groupId, user?.id])

  const handleApply = async () => {
    if (!isLoggedIn) { navigate('/auth'); return }
    setApplying(true)
    try {
      const res = await api.post(`/groups/${groupId}/apply`, { message: applyMsg.trim() || undefined })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showAlert(d.detail ?? '신청에 실패했습니다.', 'error')
        return
      }
      const app: ApplicationResponse = await res.json()
      setMyApplication(app)
      setShowReapplyForm(false)
      setApplyMsg('')
    } catch {
      showAlert('네트워크 오류가 발생했습니다.', 'error')
    } finally {
      setApplying(false)
    }
  }

  const handleProcess = async (appId: number, status: 'accepted' | 'rejected') => {
    await api.patch(`/groups/applications/${appId}`, { status })
    fetchGroup()
  }

  const handleUpdateGroup = async () => {
    if (group?.status === '종료') {
      showAlert('모집이 종료된 그룹은 수정할 수 없습니다.', 'error')
      setEditing(false)
      return
    }
    if (editForm.max_members < 2) {
      showAlert('최대 인원은 최소 2명 이상이어야 합니다.', 'error')
      return
    }
    if (editForm.max_members < (group?.current_members ?? 0)) {
      showAlert(`최대 인원은 현재 모집 인원(${group?.current_members}명)보다 적게 설정할 수 없습니다.`, 'error')
      return
    }
    const res = await api.patch(`/groups/${groupId}`, {
      title: editForm.title.trim() || undefined,
      description: editForm.description.trim() || undefined,
      max_members: editForm.max_members,
    })
    if (res.ok) { setEditing(false); fetchGroup() }
  }

  const handleDeleteGroup = async () => {
    if (!(await showConfirm('그룹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'))) return
    const res = await api.delete(`/groups/${groupId}`)
    if (res.ok) navigate('/groups')
  }

  const handleConfirmGroup = async () => {
    const res = await api.patch(`/groups/${groupId}`, { status: '종료' })
    if (res.ok) {
      showAlert('스터디 그룹이 확정되었습니다! 모집이 종료됩니다.', 'success')
      setConfirmingFull(false)
      fetchGroup()
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#E07535', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!group) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6e6e73' }}>
          <p style={{ marginBottom: 16 }}>그룹을 찾을 수 없습니다.</p>
          <motion.button
            onClick={() => navigate('/groups')}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            style={{ color: '#E07535', background: 'none', border: 'none', cursor: 'pointer' }}>
            목록으로
          </motion.button>
        </div>
      </div>
    )
  }

  const isLeader = user?.id === group.leader_id
  const isAccepted = myApplication?.status === 'accepted'
  const isConfirmed = group.status === '종료'  // 조장이 '그룹 확정하기'를 누른 상태
  const canEnterChat = isConfirmed && (isLeader || isAccepted)
  const isRecruiting = group.status === '모집중'
  const pct = Math.round((group.current_members / group.max_members) * 100)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 뒤로가기 */}
        <motion.button
          onClick={() => navigate('/groups')}
          whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 28, fontFamily: 'inherit' }}>
          ← 스터디 그룹
        </motion.button>

        {/* 그룹 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e5ea',
            borderRadius: 20, padding: '28px 28px 24px',
            marginBottom: 24,
          }}>
          {/* 상태 + 조장 배지 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: isRecruiting ? 'rgba(52,199,89,0.08)' : '#f5f5f7',
              border: `1px solid ${isRecruiting ? 'rgba(52,199,89,0.2)' : '#d2d2d7'}`,
              color: isRecruiting ? '#34C759' : '#aeaeb2',
            }}>
              {STATUS_LABEL[group.status] ?? group.status}
            </span>
            {isLeader && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(224,117,53,0.08)', border: '1px solid rgba(224,117,53,0.2)',
                color: '#E07535',
              }}>
                조장
              </span>
            )}
          </div>

          {editing ? (
            /* 수정 폼 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                style={{ background: '#f5f5f7', border: '1px solid rgba(224,117,53,0.5)', borderRadius: 10, padding: '10px 14px', fontSize: 18, fontWeight: 700, color: '#1d1d1f', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.02em' }} />
              <textarea value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="그룹 소개"
                rows={3}
                style={{ background: '#f5f5f7', border: '1px solid #d2d2d7', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1d1d1f', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
              <div>
                <label style={{ fontSize: 13, color: '#6e6e73' }}>
                  최대 인원: <strong style={{ color: '#1d1d1f' }}>{editForm.max_members}명</strong>
                  <span style={{ fontSize: 11, color: '#aeaeb2', marginLeft: 6 }}>(최소 2명, 현재 모집 {group.current_members}명 이상)</span>
                </label>
                <StyledRangeSlider
                  min={Math.max(2, group.current_members)}
                  max={30}
                  value={editForm.max_members}
                  onChange={(v) => setEditForm(f => ({ ...f, max_members: v }))}
                />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f5f5f7', border: '1px solid #e5e5ea' }}>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>모집 상태</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', marginLeft: 10 }}>
                  {STATUS_LABEL[group.status] ?? group.status}
                </span>
                <span style={{ fontSize: 11, color: '#aeaeb2', marginLeft: 8 }}>(상태는 시스템에 의해 자동으로 관리됩니다)</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  onClick={handleUpdateGroup}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  style={{ padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#E07535', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  저장
                </motion.button>
                <motion.button
                  onClick={() => setEditing(false)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  style={{ padding: '9px 18px', borderRadius: 10, fontSize: 14, background: '#f5f5f7', border: '1px solid #d2d2d7', color: '#6e6e73', cursor: 'pointer' }}>
                  취소
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.3 }}>
                {group.title}
              </h1>
              {group.description && (
                <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
                  {group.description}
                </p>
              )}

              {/* 인원 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#aeaeb2' }}>모집 현황</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73' }}>
                    {group.current_members} / {group.max_members}명
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: '#e5e5ea' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? '#FF9500' : '#E07535', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* 개설일 + 조장 액션 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>
                  {new Date(group.created_at).toLocaleDateString('ko-KR')} 개설
                </span>
                {isLeader && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button
                      onClick={() => {
                        if (isConfirmed) {
                          showAlert('모집이 종료된 그룹은 수정할 수 없습니다.', 'error')
                          return
                        }
                        setEditing(true)
                      }}
                      whileHover={{ scale: isConfirmed ? 1 : 1.1 }} whileTap={{ scale: isConfirmed ? 1 : 0.88 }}
                      style={{ fontSize: 12, color: isConfirmed ? '#aeaeb2' : '#6e6e73', background: 'none', border: 'none', cursor: isConfirmed ? 'not-allowed' : 'pointer', padding: 0, opacity: isConfirmed ? 0.5 : 1 }}>
                      그룹 수정
                    </motion.button>
                    <motion.button
                      onClick={handleDeleteGroup}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                      style={{ fontSize: 12, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      그룹 삭제
                    </motion.button>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* 모집 종료 안내 (조장에게만 표시) */}
        {isLeader && isConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginBottom: 24,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(255,59,48,0.06)',
              border: '1px solid rgba(255,59,48,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#ff3b30', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                그룹 수정 불가
              </p>
              <p style={{ fontSize: 12, color: '#ff6b61', margin: 0 }}>
                모집이 종료된 그룹은 더 이상 수정할 수 없습니다.
              </p>
            </div>
          </motion.div>
        )}

        {/* 채팅방 대기 안내 (confirmed 되지 않은 accepted 멤버 / 조장) */}
        {isLoggedIn && !isConfirmed && (isLeader || isAccepted) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginBottom: 24,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(174,174,178,0.08)',
              border: '1px solid rgba(174,174,178,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#6e6e73', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                채팅방 대기 중
              </p>
              <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>
                {isLeader
                  ? '그룹을 확정하면 채팅방이 활성화됩니다.'
                  : '조장이 그룹을 확정하면 채팅방에 입장할 수 있습니다.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* 채팅방 입장 버튼 (확정 멤버 + 조장, 그룹 종료 상태) */}
        {isLoggedIn && canEnterChat && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 24 }}
          >
            <motion.button
              onClick={() => navigate(`/groups/${groupId}/chat`)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #E07535 0%, #FF9500 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(224,117,53,0.30)',
              }}
            >
              <span style={{ fontSize: 18 }}>💬</span>
              스터디 채팅방 입장
            </motion.button>
          </motion.div>
        )}

        {/* 신청 섹션 (일반 유저) — 비로그인은 모집 중일 때만, 로그인은 신청 내역 있으면 항상 표시 */}
        {!isLeader && (isRecruiting || (isLoggedIn && !!myApplication)) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e5ea',
              borderRadius: 16, padding: '24px',
              marginBottom: 24,
            }}>

            {/* ── 비로그인 ── */}
            {!isLoggedIn ? (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: 14 }}>
                  스터디 신청
                </h2>
                <motion.button
                  onClick={() => navigate('/auth')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: '#E07535', color: '#fff', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', letterSpacing: '-0.01em',
                  }}>
                  로그인 후 신청하기
                </motion.button>
              </>
            ) : myApplication === undefined ? (
              /* ── 내 신청 로딩 중 ── */
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#E07535', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : myApplication && !showReapplyForm ? (
              /* ── 신청 결과 카드 ── */
              <AnimatePresence mode="wait">
                {myApplication.status === 'pending' && (
                  <motion.div key="pending"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#FF9500', margin: '0 0 5px', letterSpacing: '-0.01em' }}>
                      신청 완료 · 검토 중
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
                      조장의 승인을 기다리는 중입니다.
                    </p>
                    {myApplication.message && (
                      <p style={{
                        fontSize: 12, color: '#aeaeb2', marginTop: 12,
                        padding: '8px 14px', background: '#f5f5f7', borderRadius: 8,
                        fontStyle: 'italic', display: 'inline-block',
                      }}>
                        "{myApplication.message}"
                      </p>
                    )}
                  </motion.div>
                )}

                {myApplication.status === 'accepted' && (
                  <motion.div key="accepted"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>🎉</div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#34C759', margin: '0 0 5px', letterSpacing: '-0.01em' }}>
                      스터디 합류 확정!
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
                      조장이 신청을 수락했습니다.
                    </p>
                  </motion.div>
                )}

                {myApplication.status === 'rejected' && (
                  <motion.div key="rejected"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,59,48,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 10px', fontSize: 16, color: '#ff3b30', fontWeight: 700,
                    }}>✕</div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#ff3b30', margin: '0 0 5px', letterSpacing: '-0.01em' }}>
                      신청이 거절되었습니다
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 16px' }}>
                      조장이 이번 신청을 수락하지 않았습니다.
                    </p>
                    {isRecruiting && (
                      <motion.button
                        onClick={() => { setShowReapplyForm(true); setApplyMsg('') }}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '9px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                          background: '#f5f5f7', border: '1px solid #d2d2d7',
                          color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        다시 신청하기
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              /* ── 신청 폼 (최초 신청 or 재신청) ── */
              <>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: 14 }}>
                  {showReapplyForm ? '재신청' : '스터디 신청'}
                </h2>
                <textarea
                  value={applyMsg}
                  onChange={(e) => setApplyMsg(e.target.value)}
                  placeholder="조장에게 전달할 메시지 (선택)"
                  rows={3}
                  style={{
                    width: '100%', background: '#f5f5f7', border: '1px solid #d2d2d7',
                    borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1d1d1f',
                    outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {showReapplyForm && (
                    <motion.button
                      onClick={() => setShowReapplyForm(false)}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{
                        flexShrink: 0, padding: '12px 18px', borderRadius: 12, fontSize: 14,
                        background: '#f5f5f7', border: '1px solid #d2d2d7',
                        color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      취소
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleApply}
                    disabled={applying}
                    whileHover={!applying ? { scale: 1.02 } : {}}
                    whileTap={!applying ? { scale: 0.97 } : {}}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      background: applying ? 'rgba(224,117,53,0.35)' : '#E07535',
                      color: '#fff', border: 'none',
                      cursor: applying ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'background 0.2s',
                    }}>
                    {applying ? '신청 중...' : showReapplyForm ? '재신청하기' : '스터디 신청하기'}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* 정원 마감 확정 유도 배너 (조장 전용) */}
        {isLeader && group.status === '모집완료' && (
          <AnimatePresence>
            {!confirmingFull ? (
              <motion.div
                key="banner-collapsed"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(255,149,0,0.10) 0%, rgba(224,117,53,0.08) 100%)',
                  border: '1px solid rgba(255,149,0,0.28)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                      모집 인원이 모두 찼습니다!
                    </p>
                    <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
                      스터디 그룹을 확정하시겠습니까?
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    onClick={() => setConfirmingFull(true)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                    style={{
                      padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: '#FF9500', color: '#fff', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
                    }}
                  >
                    그룹 확정하기
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="banner-expanded"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  padding: '22px 24px',
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1.5px solid rgba(255,149,0,0.35)',
                  boxShadow: '0 4px 20px rgba(255,149,0,0.10)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <span style={{ fontSize: 26 }}>🎯</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                      스터디 그룹을 확정하시겠습니까?
                    </p>
                    <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>
                      확정하면 모집이 종료되고 선발된 멤버들로 스터디가 시작됩니다.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button
                    onClick={handleConfirmGroup}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      background: '#FF9500', color: '#fff', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
                    }}
                  >
                    ✓ 확정하기
                  </motion.button>
                  <motion.button
                    onClick={() => setConfirmingFull(false)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '11px 20px', borderRadius: 12, fontSize: 14,
                      background: '#f5f5f7', border: '1px solid #d2d2d7',
                      color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    나중에
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* 신청 목록 (조장 전용) */}
        {isLeader && group.applications && group.applications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em', marginBottom: 14 }}>
              신청 목록 ({group.applications.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.applications.map(app => (
                <ApplicationRow key={app.id} app={app} onProcess={handleProcess} />
              ))}
            </div>
          </motion.div>
        )}

        {isLeader && (!group.applications || group.applications.length === 0) && (
          <div style={{ fontSize: 14, color: '#aeaeb2', padding: '24px 0' }}>
            아직 신청자가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
