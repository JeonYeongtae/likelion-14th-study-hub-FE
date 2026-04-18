/**
 * PostDetailPage.tsx
 *
 * GET  /api/v1/posts/{id}
 * POST /api/v1/posts/{id}/like
 * GET  /api/v1/posts/{id}/comments/
 * POST /api/v1/posts/{id}/comments/   (댓글 / 대댓글)
 * PATCH/DELETE /api/v1/posts/{id}/comments/{cid}
 * PATCH/DELETE /api/v1/posts/{id}
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import type { PostResponse, CommentResponse } from '../types/api'

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  postId,
  myId,
  onRefresh,
}: {
  comment: CommentResponse
  postId: number
  myId: number | undefined
  onRefresh: () => void
}) {
  const { showConfirm } = useAlert()
  const isOwner = myId === comment.user_id
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async () => {
    if (!editContent.trim()) return
    const res = await api.patch(`/posts/${postId}/comments/${comment.id}`, { content: editContent })
    if (res.ok) { setEditing(false); onRefresh() }
  }

  const handleDelete = async () => {
    if (!(await showConfirm('댓글을 삭제하시겠습니까?'))) return
    await api.delete(`/posts/${postId}/comments/${comment.id}`)
    onRefresh()
  }

  const handleReply = async () => {
    if (isSubmitting) return
    if (!replyContent.trim()) return
    setIsSubmitting(true)
    try {
      const res = await api.post(`/posts/${postId}/comments/`, {
        content: replyContent,
        parent_comment_id: comment.id,
      })
      if (res.ok) { setReplying(false); setReplyContent(''); onRefresh() }
    } catch {
      // network error — 사용자 알림 없이 무시
    } finally {
      setIsSubmitting(false)
    }
  }

  const isReply = comment.parent_comment_id !== null
  const displayName = comment.nickname || `user_${comment.user_id}`
  const avatarInitial = displayName.charAt(0).toUpperCase()
  const avatarHue = (comment.user_id * 37) % 360

  return (
    <div>
      <div style={{
        padding: isReply ? '8px 0 8px 2px' : '14px 0 10px',
        background: 'transparent',
        marginBottom: 0,
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: isReply ? 22 : 28, height: isReply ? 22 : 28, borderRadius: '50%',
              background: `hsl(${avatarHue}, 50%, 55%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isReply ? 10 : 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {avatarInitial}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
              {displayName}
            </span>
            <span style={{ fontSize: 11, color: '#aeaeb2' }}>
              {formatDate(comment.created_at)}
            </span>
            {comment.updated_at && (
              <span style={{ fontSize: 11, color: '#aeaeb2' }}>(수정됨)</span>
            )}
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                onClick={() => setEditing(true)}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                style={{ fontSize: 12, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                수정
              </motion.button>
              <motion.button
                onClick={handleDelete}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                style={{ fontSize: 12, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                삭제
              </motion.button>
            </div>
          )}
        </div>

        {/* 본문 or 수정 폼 — 아코디언 애니메이션 */}
        <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div
              key="edit-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingBottom: 2 }}>
                <input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate() } }}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: 20, fontSize: 14,
                    background: '#f5f5f7', border: '1px solid rgba(224,117,53,0.5)',
                    color: '#1d1d1f', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <motion.button
                  onClick={handleUpdate}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                  style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#E07535', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  저장
                </motion.button>
                <motion.button
                  onClick={() => { setEditing(false); setEditContent(comment.content) }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                  style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, background: '#f5f5f7', border: '1px solid #d2d2d7', color: '#6e6e73', cursor: 'pointer' }}>
                  취소
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.65, margin: 0 }}
            >
              {comment.content}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 대댓글 버튼 */}
        {!isReply && myId && !editing && (
          <motion.button
            onClick={() => setReplying(!replying)}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            style={{ marginTop: 8, fontSize: 12, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {replying ? '취소' : '↩ 답글'}
          </motion.button>
        )}

        {/* 대댓글 입력 — 아코디언 (기존 패턴 유지) */}
        <AnimatePresence>
          {replying && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden', marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: 20, fontSize: 13,
                    background: '#f5f5f7', border: '1px solid rgba(224,117,53,0.4)',
                    color: '#1d1d1f', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <motion.button
                  onClick={handleReply}
                  disabled={isSubmitting}
                  whileHover={!isSubmitting ? { scale: 1.04 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.93 } : {}}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    background: isSubmitting ? 'rgba(224,117,53,0.6)' : '#E07535',
                    color: '#fff', border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    minWidth: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {isSubmitting
                    ? <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    : '작성'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── PostDetailPage ───────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showConfirm } = useAlert()
  const postId = Number(id)

  const [post, setPost] = useState<PostResponse | null>(null)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', content: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false) // 동기적 lock — useState는 배치 업데이트라 경쟁 조건 발생

  const fetchPost = useCallback(async () => {
    const res = await api.get(`/posts/${postId}`)
    if (res.ok) {
      const p = await res.json()
      setPost(p)
      setLiked(p.is_liked ?? false)
      setEditForm({ title: p.title, content: p.content })
    }
  }, [postId])

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/v1/posts/${postId}/comments/`)
    if (res.ok) setComments(await res.json())
  }, [postId])

  useEffect(() => {
    Promise.all([fetchPost(), fetchComments()]).finally(() => setLoading(false))
  }, [fetchPost, fetchComments])

  const handleLike = async () => {
    if (!isLoggedIn) { navigate('/auth'); return }
    const res = await api.post(`/posts/${postId}/like`)
    if (res.ok) setLiked(!liked)
  }

  const handleComment = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    // submittingRef: 동기적 lock. isSubmitting(state)만으로는 React 배치 업데이트로 인해
    // 두 번째 호출이 여전히 false를 읽어 중복 전송이 발생함.
    if (submittingRef.current || !commentInput.trim()) return
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const res = await api.post(`/posts/${postId}/comments/`, { content: commentInput })
      if (res.ok) { setCommentInput(''); fetchComments() }
    } catch {
      // network error
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleUpdatePost = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) return
    const res = await api.patch(`/posts/${postId}`, editForm)
    if (res.ok) { setEditing(false); fetchPost() }
  }

  const handleDeletePost = async () => {
    if (!(await showConfirm('게시글을 삭제하시겠습니까?'))) return
    const res = await api.delete(`/posts/${postId}`)
    if (res.ok) navigate('/community')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#E07535', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6e6e73' }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>게시글을 찾을 수 없습니다.</p>
          <motion.button
            onClick={() => navigate('/community')}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            style={{ color: '#E07535', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            목록으로 돌아가기
          </motion.button>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === post.user_id

  // 댓글 트리 구성 (parent_comment_id 기준)
  const topComments = comments.filter(c => c.parent_comment_id === null)
  const replyMap: Record<number, CommentResponse[]> = {}
  comments.filter(c => c.parent_comment_id !== null).forEach(c => {
    const pid = c.parent_comment_id!
    if (!replyMap[pid]) replyMap[pid] = []
    replyMap[pid].push(c)
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 뒤로가기 */}
        <motion.button
          onClick={() => navigate('/community')}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 28, fontFamily: 'inherit' }}>
          ← 커뮤니티로
        </motion.button>

        {/* 게시글 본문 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#ffffff',
            border: '1px solid #e5e5ea',
            borderRadius: 20,
            padding: '32px',
            marginBottom: 24,
          }}>

          {editing ? (
            /* 수정 폼 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                style={{
                  background: '#f5f5f7', border: '1px solid rgba(224,117,53,0.5)',
                  borderRadius: 12, padding: '12px 16px', fontSize: 22, fontWeight: 700,
                  color: '#1d1d1f', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.03em',
                }} />
              <textarea value={editForm.content}
                onChange={(e) => setEditForm(f => ({ ...f, content: e.target.value }))}
                rows={10}
                style={{
                  background: '#f5f5f7', border: '1px solid rgba(224,117,53,0.5)',
                  borderRadius: 12, padding: '12px 16px', fontSize: 15,
                  color: '#1d1d1f', outline: 'none', resize: 'vertical',
                  lineHeight: 1.75, fontFamily: 'inherit',
                }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  onClick={handleUpdatePost}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#E07535', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  저장
                </motion.button>
                <motion.button
                  onClick={() => { setEditing(false); setEditForm({ title: post.title, content: post.content }) }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, background: '#f5f5f7', border: '1px solid #d2d2d7', color: '#6e6e73', cursor: 'pointer' }}>
                  취소
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              {/* 제목 */}
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.3 }}>
                {post.title}
              </h1>

              {/* 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#aeaeb2', marginBottom: 28, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: `hsl(${(post.user_id * 37) % 360}, 50%, 55%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {(post.nickname || `user_${post.user_id}`).charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#1d1d1f', fontWeight: 500 }}>
                    {post.nickname || `user_${post.user_id}`}
                  </span>
                </span>
                <span>{formatDate(post.created_at)}</span>
                <span>조회 {post.view_count ?? 0}</span>
                {post.is_edited && <span>(수정됨)</span>}
              </div>

              {/* 본문 */}
              <div style={{
                fontSize: 15, color: '#1d1d1f', lineHeight: 1.8,
                marginBottom: 32, borderBottom: '1px solid #f2f2f7',
                paddingBottom: 32, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {post.content}
              </div>

              {/* 이미지 */}
              {post.images && post.images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                  {post.images.map(img => (
                    <img key={img.id} src={img.image_url} alt=""
                      style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid #e5e5ea' }} />
                  ))}
                </div>
              )}

              {/* 좋아요 + 수정/삭제 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  onClick={handleLike}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 999,
                    background: liked ? 'rgba(255,59,48,0.08)' : '#f5f5f7',
                    border: `1px solid ${liked ? 'rgba(255,59,48,0.3)' : '#d2d2d7'}`,
                    color: liked ? '#ff3b30' : '#6e6e73',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <span>{liked ? '♥' : '♡'}</span> 좋아요
                </motion.button>

                {isOwner && (
                  <>
                    <motion.button
                      onClick={() => setEditing(true)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                      style={{ fontSize: 13, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      수정
                    </motion.button>
                    <motion.button
                      onClick={handleDeletePost}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                      style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      삭제
                    </motion.button>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* 댓글 영역 */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e5ea',
          borderRadius: 20,
          padding: '28px 32px',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: 16 }}>
            댓글 {comments.length}
          </h2>

          {/* 댓글 목록 */}
          {topComments.map(comment => {
            const replies = replyMap[comment.id] ?? []
            return (
              <div key={comment.id} style={{ borderBottom: '1px solid #f2f2f7' }}>
                <CommentItem
                  comment={comment}
                  postId={postId}
                  myId={user?.id}
                  onRefresh={fetchComments}
                />
                {/* 대댓글 영역 — YouTube 스타일: 수직선 하나가 전체 대댓글 관통 */}
                {replies.length > 0 && (
                  <div style={{
                    marginLeft: 14,      /* 부모 아바타 중앙 정렬 */
                    paddingLeft: 22,     /* 수직선~내용 간격 */
                    borderLeft: '2px solid #e5e5ea',
                    marginBottom: 8,
                  }}>
                    {replies.map(reply => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        postId={postId}
                        myId={user?.id}
                        onRefresh={fetchComments}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {comments.length === 0 && (
            <p style={{ fontSize: 14, color: '#aeaeb2', padding: '16px 0' }}>
              첫 댓글을 남겨보세요.
            </p>
          )}

          {/* 댓글 입력 */}
          {isLoggedIn ? (
            <form onSubmit={handleComment}
              style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 입력하세요..."
                disabled={isSubmitting}
                style={{
                  flex: 1, padding: '11px 18px', borderRadius: 24, fontSize: 14,
                  background: isSubmitting ? 'rgba(245,245,247,0.6)' : '#f5f5f7',
                  border: '1px solid #d2d2d7',
                  color: '#1d1d1f', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  cursor: isSubmitting ? 'not-allowed' : 'text',
                }}
                onFocus={(e) => { if (!isSubmitting) e.target.style.borderColor = 'rgba(224,117,53,0.5)' }}
                onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')}
              />
              <motion.button type="submit"
                disabled={!commentInput.trim() || isSubmitting}
                whileHover={commentInput.trim() && !isSubmitting ? { scale: 1.04 } : {}}
                whileTap={commentInput.trim() && !isSubmitting ? { scale: 0.94 } : {}}
                style={{
                  padding: '11px 22px', borderRadius: 24, fontSize: 14, fontWeight: 600,
                  background: (commentInput.trim() && !isSubmitting) ? '#E07535' : 'rgba(224,117,53,0.3)',
                  color: '#fff', border: 'none',
                  cursor: (commentInput.trim() && !isSubmitting) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', minWidth: 68,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                {isSubmitting
                  ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  : '작성'}
              </motion.button>
            </form>
          ) : (
            <motion.button
              onClick={() => navigate('/auth')}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{
                marginTop: 24, width: '100%', padding: '12px', borderRadius: 24,
                background: '#f5f5f7', border: '1px solid #e5e5ea',
                color: '#aeaeb2', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              댓글을 작성하려면 로그인하세요
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
