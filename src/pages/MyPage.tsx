/**
 * MyPage.tsx  —  Apple Account 스타일
 *
 * 레이아웃: 좌측 사이드바(아바타·이름·이메일·네비) + 우측 콘텐츠
 *
 * 사이드바 섹션:
 *   개인 정보 | 내 게시글 | 내 댓글 | 좋아요 | 예약 | 계정 관리
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import LiquidGlassBase from '../components/liquid-glass/LiquidGlassBase';
import type { ProfileResponse, PostResponse, CommentResponse, ReservationResponse, MyApplicationResponse, StudyGroupDetailResponse } from '../types/api';

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function fd(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 탭 정의 ──────────────────────────────────────────────────────────────────

type Section = 'profile' | 'posts' | 'comments' | 'likes' | 'reservations' | 'studies' | 'security';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'profile', label: '개인 정보' },
  { id: 'posts', label: '내 게시글' },
  { id: 'comments', label: '내 댓글' },
  { id: 'likes', label: '좋아요' },
  { id: 'reservations', label: '예약' },
  { id: 'studies', label: '스터디' },
  { id: 'security', label: '계정 관리' },
];

// ─── 공통 Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  action,
  separator = true,
}: {
  label: string;
  value?: React.ReactNode;
  action?: React.ReactNode;
  separator?: boolean;
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, color: '#1d1d1f', flexShrink: 0, minWidth: 80 }}>{label}</span>
        <span style={{ fontSize: 14, color: '#1d1d1f', flex: 1, textAlign: 'right' }}>{value}</span>
        {action}
      </div>
      {separator && <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />}
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6e6e73',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e5e5ea',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── 개인 정보 섹션 ────────────────────────────────────────────────────────────

function ProfileSection({ profile, onUpdated }: { profile: ProfileResponse; onUpdated: () => void }) {
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nickname.trim() || nickname === profile.nickname) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await api.patch('/users/me', { nickname: nickname.trim() });
    setSaving(false);
    if (res.ok) {
      setMsg('변경되었습니다.');
      setEditing(false);
      onUpdated();
      showAlert('닉네임이 변경되었습니다.', 'success');
      setTimeout(() => setMsg(null), 2400);
    } else {
      setMsg('변경에 실패했습니다.');
      showAlert('닉네임 변경에 실패했습니다.', 'error');
    }
  };

  return (
    <>
      <SectionCard title="계정">
        <div style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#1d1d1f', minWidth: 80 }}>닉네임</span>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                  autoFocus
                  style={{
                    fontSize: 14,
                    color: '#1d1d1f',
                    border: '1px solid #0071e3',
                    borderRadius: 8,
                    padding: '5px 10px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: 160,
                  }}
                />
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={!saving ? { scale: 1.05 } : {}}
                  whileTap={!saving ? { scale: 0.93 } : {}}
                  style={{
                    fontSize: 13,
                    color: '#fff',
                    background: saving ? 'rgba(0,113,227,0.5)' : '#0071e3',
                    border: 'none',
                    borderRadius: 8,
                    padding: '5px 14px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? '...' : '저장'}
                </motion.button>
                <motion.button
                  onClick={() => {
                    setEditing(false);
                    setNickname(profile.nickname);
                  }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                  style={{
                    fontSize: 13,
                    color: '#6e6e73',
                    background: 'none',
                    border: '1px solid #d2d2d7',
                    borderRadius: 8,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  취소
                </motion.button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, color: '#1d1d1f' }}>{profile.nickname}</span>
                <motion.button
                  onClick={() => setEditing(true)}
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                  style={{
                    fontSize: 13,
                    color: '#0071e3',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  편집
                </motion.button>
              </div>
            )}
          </div>

          {/* 인라인 메시지 — 부드러운 높이 전환 (아코디언) */}
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: msg.includes('실패') ? '#ff3b30' : '#34c759',
                    margin: '6px 0 0',
                  }}
                >
                  {msg}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />
        <InfoRow label="이메일" value={profile.email} />
        <InfoRow
          label="역할"
          value={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: profile.role === 'admin' ? '#fff3e8' : '#f2f2f7',
                color: profile.role === 'admin' ? '#e07535' : '#6e6e73',
              }}
            >
              {profile.role === 'admin' ? '관리자' : '일반 회원'}
            </span>
          }
        />
        <InfoRow label="가입일" value={fd(profile.created_at)} separator={false} />
      </SectionCard>
    </>
  );
}

// ─── 게시글 / 댓글 / 좋아요 섹션 ──────────────────────────────────────────────

function PostListSection({ posts, onNavigate }: { posts: PostResponse[]; onNavigate: (id: number) => void }) {
  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 14 }}>게시글이 없습니다.</div>
    );
  }
  return (
    <SectionCard title={`게시글 ${posts.length}개`}>
      {posts.map((p, i) => (
        <React.Fragment key={p.id}>
          <div
            onClick={() => onNavigate(p.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  color: '#1d1d1f',
                  margin: '0 0 2px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.title}
              </p>
              <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
                {fd(p.created_at)} · 조회 {p.view_count ?? 0}
              </p>
            </div>
            <svg
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="#c7c7cc"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
          {i < posts.length - 1 && <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />}
        </React.Fragment>
      ))}
    </SectionCard>
  );
}

function CommentListSection({
  comments,
  onNavigate,
}: {
  comments: CommentResponse[];
  onNavigate: (postId: number) => void;
}) {
  if (comments.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 14 }}>댓글이 없습니다.</div>
    );
  }
  return (
    <SectionCard title={`댓글 ${comments.length}개`}>
      {comments.map((c, i) => (
        <React.Fragment key={c.id}>
          <div
            onClick={() => onNavigate(c.post_id)}
            style={{
              padding: '14px 20px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <p
              style={{
                fontSize: 14,
                color: '#1d1d1f',
                margin: '0 0 4px',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {c.content}
            </p>
            <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>
              {fd(c.created_at)} · 게시글 #{c.post_id}
            </p>
          </div>
          {i < comments.length - 1 && <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />}
        </React.Fragment>
      ))}
    </SectionCard>
  );
}

// ─── 예약 섹션 ────────────────────────────────────────────────────────────────

function ReservationsSection({
  reservations,
  onCancel,
}: {
  reservations: ReservationResponse[];
  onCancel: (id: number) => void;
}) {
  if (reservations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 14 }}>
        예약 내역이 없습니다.
      </div>
    );
  }

  const now = new Date();
  const upcoming = reservations.filter((r) => new Date(r.end_time) > now);
  const past = reservations.filter((r) => new Date(r.end_time) <= now);

  const Row = ({ r, separator = true }: { r: ReservationResponse; separator?: boolean }) => {
    const start = new Date(r.start_time);
    const end = new Date(r.end_time);
    const isFuture = end > now;
    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', margin: '0 0 2px' }}>룸 #{r.room_id}</p>
            <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>
              {fd(r.start_time)} {String(start.getHours()).padStart(2, '0')}:00 –&nbsp;
              {String(end.getHours()).padStart(2, '0')}:00
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                background: r.status === 'confirmed' ? '#e8fde8' : '#f2f2f7',
                color: r.status === 'confirmed' ? '#34c759' : '#aeaeb2',
              }}
            >
              {r.status === 'confirmed' ? '확정' : r.status}
            </span>
            {isFuture && (
              <motion.button
                onClick={() => onCancel(r.id)}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                style={{
                  fontSize: 13,
                  color: '#ff3b30',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                취소
              </motion.button>
            )}
          </div>
        </div>
        {separator && <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />}
      </>
    );
  };

  return (
    <>
      {upcoming.length > 0 && (
        <SectionCard title="예정된 예약">
          {upcoming.map((r, i) => (
            <Row key={r.id} r={r} separator={i < upcoming.length - 1} />
          ))}
        </SectionCard>
      )}
      {past.length > 0 && (
        <SectionCard title="지난 예약">
          <div style={{ opacity: 0.6 }}>
            {past.map((r, i) => (
              <Row key={r.id} r={r} separator={i < past.length - 1} />
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

// ─── 스터디 섹션 ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '검토 중',   color: '#e07535', bg: '#fef3e8' },
  accepted: { label: '수락됨',   color: '#34c759', bg: '#e8fde8' },
  rejected: { label: '거절됨',   color: '#ff3b30', bg: '#fde8e8' },
};

const GROUP_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  '모집중':   { label: '모집중',   color: '#0071e3', bg: '#e8f0fe' },
  '모집완료': { label: '모집완료', color: '#6e6e73', bg: '#f2f2f7' },
  '종료':     { label: '종료',     color: '#aeaeb2', bg: '#f9f9fb' },
};

function StudiesSection({
  myApplications,
  myGroups,
  onNavigate,
}: {
  myApplications: MyApplicationResponse[];
  myGroups: StudyGroupDetailResponse[];
  onNavigate: (groupId: number) => void;
}) {
  return (
    <>
      {/* 내가 신청한 스터디 */}
      <SectionCard title={`신청한 스터디 ${myApplications.length}개`}>
        {myApplications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aeaeb2', fontSize: 14 }}>
            신청한 스터디가 없습니다.
          </div>
        ) : (
          myApplications.map((app, i) => {
            const statusMeta = STATUS_META[app.status] ?? { label: app.status, color: '#6e6e73', bg: '#f2f2f7' };
            const groupMeta = GROUP_STATUS_META[app.group_status] ?? { label: app.group_status, color: '#6e6e73', bg: '#f2f2f7' };
            return (
              <React.Fragment key={app.id}>
                <div
                  onClick={() => onNavigate(app.group_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    gap: 12,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        color: '#1d1d1f',
                        margin: '0 0 4px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        fontWeight: 500,
                      }}
                    >
                      {app.group_title}
                    </p>
                    <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>
                      {fd(app.created_at)} 신청
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: groupMeta.bg,
                        color: groupMeta.color,
                      }}
                    >
                      {groupMeta.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: statusMeta.bg,
                        color: statusMeta.color,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
                {i < myApplications.length - 1 && (
                  <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />
                )}
              </React.Fragment>
            );
          })
        )}
      </SectionCard>

      {/* 내가 만든 그룹 (조장 뷰) */}
      {myGroups.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionCard title={`내 그룹 신청 현황 ${myGroups.length}개`}>
            {myGroups.map((group, gi) => {
              const gMeta = GROUP_STATUS_META[group.status] ?? { label: group.status, color: '#6e6e73', bg: '#f2f2f7' };
              const pendingCount = group.applications?.filter((a) => a.status === 'pending').length ?? 0;
              return (
                <React.Fragment key={group.id}>
                  <div>
                    {/* 그룹 헤더 */}
                    <div
                      onClick={() => onNavigate(group.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px 10px',
                        cursor: 'pointer',
                        gap: 12,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1d1d1f',
                              margin: 0,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {group.title}
                          </p>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: gMeta.bg,
                              color: gMeta.color,
                              flexShrink: 0,
                            }}
                          >
                            {gMeta.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6e6e73', margin: '3px 0 0' }}>
                          {group.current_members}/{group.max_members}명
                          {pendingCount > 0 && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#e07535',
                                background: '#fef3e8',
                                padding: '1px 6px',
                                borderRadius: 5,
                              }}
                            >
                              신규 신청 {pendingCount}건
                            </span>
                          )}
                        </p>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        width={14}
                        height={14}
                        fill="none"
                        stroke="#c7c7cc"
                        strokeWidth={2}
                        strokeLinecap="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>

                    {/* 신청자 목록 */}
                    {group.applications && group.applications.length > 0 && (
                      <div style={{ padding: '0 20px 12px' }}>
                        <div
                          style={{
                            background: '#f9f9fb',
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: '1px solid #f2f2f7',
                          }}
                        >
                          {group.applications.map((app, ai) => {
                            const sMeta = STATUS_META[app.status] ?? { label: app.status, color: '#6e6e73', bg: '#f2f2f7' };
                            return (
                              <React.Fragment key={app.id}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      background: `hsl(${(app.applicant_id * 47) % 360}, 50%, 55%)`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: '#fff',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {app.applicant_id}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, color: '#1d1d1f', margin: '0 0 1px', fontWeight: 500 }}>
                                      회원 #{app.applicant_id}
                                    </p>
                                    {app.message && (
                                      <p
                                        style={{
                                          fontSize: 12,
                                          color: '#6e6e73',
                                          margin: 0,
                                          overflow: 'hidden',
                                          whiteSpace: 'nowrap',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {app.message}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: 5,
                                      background: sMeta.bg,
                                      color: sMeta.color,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {sMeta.label}
                                  </span>
                                </div>
                                {ai < group.applications!.length - 1 && (
                                  <div style={{ height: 1, background: '#f2f2f7', margin: '0 14px' }} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {group.applications?.length === 0 && (
                      <p style={{ fontSize: 13, color: '#aeaeb2', padding: '0 20px 14px', margin: 0 }}>
                        신청자가 없습니다.
                      </p>
                    )}
                  </div>
                  {gi < myGroups.length - 1 && (
                    <div style={{ height: 1, background: '#f2f2f7', margin: '0 20px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </SectionCard>
        </div>
      )}
    </>
  );
}

// ─── 계정 관리 섹션 ───────────────────────────────────────────────────────────

function SecuritySection() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showConfirm } = useAlert();

  const handleWithdraw = async () => {
    if (!(await showConfirm('정말 탈퇴하시겠습니까? 30일 이내에 복구할 수 있습니다.'))) return;
    const res = await api.delete('/auth/withdraw');
    if (res.ok) {
      await logout();
      navigate('/');
    }
  };

  return (
    <SectionCard title="계정 관리">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
        }}
      >
        <span style={{ fontSize: 14, color: '#1d1d1f' }}>회원 탈퇴</span>
        <motion.button
          onClick={handleWithdraw}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
          style={{
            fontSize: 13,
            color: '#ff3b30',
            background: 'none',
            border: '1px solid #ffd7d5',
            borderRadius: 8,
            padding: '5px 14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          탈퇴하기
        </motion.button>
      </div>
    </SectionCard>
  );
}

// ─── MyPage ───────────────────────────────────────────────────────────────────

export default function MyPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { showConfirm } = useAlert();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get('section') ?? 'profile') as Section;

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [likes, setLikes] = useState<PostResponse[]>([]);
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplicationResponse[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroupDetailResponse[]>([]);
  const [loaded, setLoaded] = useState<Set<Section>>(new Set());

  const loadSection = useCallback(
    async (s: Section) => {
      if (loaded.has(s)) return;
      setLoaded((prev) => new Set([...prev, s]));
      try {
        if (s === 'profile') {
          const r = await api.get('/users/me');
          if (r.ok) setProfile(await r.json());
        } else if (s === 'posts') {
          const r = await api.get('/my/posts');
          if (r.ok) setPosts(await r.json());
        } else if (s === 'comments') {
          const r = await api.get('/my/comments');
          if (r.ok) setComments(await r.json());
        } else if (s === 'likes') {
          const r = await api.get('/my/likes');
          if (r.ok) setLikes(await r.json());
        } else if (s === 'reservations') {
          const r = await api.get('/reservations/me');
          if (r.ok) setReservations(await r.json());
        } else if (s === 'studies') {
          const [rApps, rGroups] = await Promise.all([
            api.get('/my/applications'),
            api.get('/my/groups'),
          ]);
          if (rApps.ok) setMyApplications(await rApps.json());
          if (rGroups.ok) setMyGroups(await rGroups.json());
        }
      } catch {
        /* ignore */
      }
    },
    [loaded],
  );

  useEffect(() => {
    loadSection(section);
  }, [section]); // eslint-disable-line

  const setSection = (s: Section) => {
    setSearchParams({ section: s });
    loadSection(s);
  };

  const handleCancelReservation = async (id: number) => {
    if (!(await showConfirm('예약을 취소하시겠습니까?'))) return;
    await api.delete(`/reservations/${id}`);
    const r = await api.get('/reservations/me');
    if (r.ok) setReservations(await r.json());
  };

  // 아바타 색상 (id 기반)
  const avatarColor = profile ? `hsl(${(profile.id * 47) % 360}, 55%, 48%)` : '#6e6e73';
  const avatarLetter = (user?.nickname ?? '?').charAt(0).toUpperCase();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f7',
        paddingTop: 52,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* 페이지 타이틀 */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e5ea',
          padding: '20px 48px',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6e6e73',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 2px',
          }}
        >
          Study Hub
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>계정</h1>
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '40px 24px 80px',
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: '0 48px',
          alignItems: 'start',
        }}
      >
        {/* ── 사이드바 ─────────────────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 80 }}>
          <LiquidGlassBase
            borderRadius={20}
            blur={24}
            tint="rgba(10,10,20,0.05)"
            withDistortion={false}
            style={{
              padding: '24px 12px 16px',
              border: '0.5px solid rgba(255,255,255,0.38)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            {/* 아바타 */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 auto 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
                }}
              >
                {avatarLetter}
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1d1d1f',
                  margin: '0 0 3px',
                  letterSpacing: '-0.02em',
                }}
              >
                {user?.nickname ?? '...'}
              </p>
              <p style={{ fontSize: 11, color: '#6e6e73', margin: 0, wordBreak: 'break-all' }}>
                {user?.email ?? ''}
              </p>
            </div>

            {/* 구분선 */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: 10 }} />

            {/* 네비게이션 */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_ITEMS.map((item) => {
                const active = section === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    whileHover={!active ? { scale: 1.02, x: 2 } : {}}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      background: active ? 'rgba(255,255,255,0.88)' : 'transparent',
                      color: active ? '#E07535' : '#1d1d1f',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.18s, color 0.18s',
                      width: '100%',
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && (
                      <svg
                        viewBox="0 0 24 24"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="#E07535"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </LiquidGlassBase>
        </aside>

        {/* ── 메인 콘텐츠 ───────────────────────────────────────────────── */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* 섹션 타이틀 */}
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#1d1d1f',
                  letterSpacing: '-0.02em',
                  margin: '0 0 24px',
                }}
              >
                {NAV_ITEMS.find((n) => n.id === section)?.label}
              </h2>

              {section === 'profile' && profile && (
                <ProfileSection
                  profile={profile}
                  onUpdated={() => {
                    setLoaded((p) => {
                      const n = new Set(p);
                      n.delete('profile');
                      return n;
                    });
                    refresh();
                  }}
                />
              )}

              {section === 'posts' && (
                <PostListSection posts={posts} onNavigate={(id) => navigate(`/community/${id}`)} />
              )}

              {section === 'comments' && (
                <CommentListSection comments={comments} onNavigate={(id) => navigate(`/community/${id}`)} />
              )}

              {section === 'likes' && (
                <PostListSection posts={likes} onNavigate={(id) => navigate(`/community/${id}`)} />
              )}

              {section === 'reservations' && (
                <ReservationsSection reservations={reservations} onCancel={handleCancelReservation} />
              )}

              {section === 'studies' && (
                <StudiesSection
                  myApplications={myApplications}
                  myGroups={myGroups}
                  onNavigate={(groupId) => navigate(`/groups/${groupId}`)}
                />
              )}

              {section === 'security' && <SecuritySection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
