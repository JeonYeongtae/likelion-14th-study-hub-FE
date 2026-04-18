/**
 * CommunityPage.tsx
 *
 * GET /api/v1/posts/?keyword=&page=&size=20
 * - 게시글 목록 + 키워드 검색 + 페이지네이션
 * - 로그인 시 '글쓰기' 버튼 노출 → 인라인 작성 모달
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { PostListResponse, PostResponse } from '../types/api'

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}시간 전`
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: PostResponse }) {
  const navigate = useNavigate()

  return (
    <motion.div
      onClick={() => navigate(`/community/${post.id}`)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5ea',
        borderRadius: 16,
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#d2d2d7'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#e5e5ea'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* 제목 */}
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: '#1d1d1f',
        letterSpacing: '-0.02em',
        marginBottom: 8,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 1,
        WebkitBoxOrient: 'vertical',
      }}>
        {post.title}
      </h3>

      {/* 내용 미리보기 */}
      <p style={{
        fontSize: 14,
        color: '#6e6e73',
        lineHeight: 1.6,
        marginBottom: 16,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {post.content}
      </p>

      {/* 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#aeaeb2' }}>
        {/* 닉네임 */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: `hsl(${(post.user_id * 37) % 360}, 50%, 55%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {(post.nickname || '?').charAt(0).toUpperCase()}
          </div>
          <span style={{ color: '#6e6e73', fontWeight: 500 }}>{post.nickname || `user_${post.user_id}`}</span>
        </span>
        <span>{formatDate(post.created_at)}</span>
        {/* 조회수 */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {post.view_count ?? 0}
        </span>
        {/* 댓글 수 */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {post.comment_count ?? 0}
        </span>
        {post.is_edited && (
          <span style={{ color: '#aeaeb2', fontSize: 11 }}>(수정됨)</span>
        )}
      </div>
    </motion.div>
  )
}

// ─── WriteModal ───────────────────────────────────────────────────────────────

function WriteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/posts/', { title: title.trim(), content: content.trim() })
      if (!res.ok) { setError('게시글 작성에 실패했습니다.'); return }
      onSuccess()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 560,
          background: '#ffffff',
          border: '1px solid #e5e5ea',
          borderRadius: 20,
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>
            새 게시글
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#aeaeb2', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            maxLength={100}
            autoFocus
            style={{
              background: '#f5f5f7',
              border: '1px solid #d2d2d7',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 15,
              fontWeight: 600,
              color: '#1d1d1f',
              outline: 'none',
              letterSpacing: '-0.02em',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            rows={8}
            style={{
              background: '#f5f5f7',
              border: '1px solid #d2d2d7',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              color: '#1d1d1f',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.7,
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')}
          />

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 13, color: '#ff3b30', margin: 0 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: '#f5f5f7', border: '1px solid #d2d2d7',
                color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              취소
            </button>
            <motion.button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{
                padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: loading || !title.trim() || !content.trim() ? 'rgba(224,117,53,0.3)' : '#E07535',
                color: '#fff', border: 'none', cursor: loading || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', letterSpacing: '-0.01em',
              }}>
              {loading ? '게시 중...' : '게시하기'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── CommunityPage ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function CommunityPage() {
  const { isLoggedIn } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const [data, setData] = useState<PostListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(keyword)
  const [showWrite, setShowWrite] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
      if (keyword) params.set('keyword', keyword)
      const res = await fetch(`/api/v1/posts/?${params}`)
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, keyword])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (searchInput.trim()) p.set('keyword', searchInput.trim())
    p.set('page', '1')
    setSearchParams(p)
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      paddingTop: 80,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E07535' }}>
            Community
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '8px 0 0' }}>
            커뮤니티
          </h1>
        </motion.div>

        {/* 검색 + 글쓰기 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목, 내용, 닉네임으로 검색"
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #d2d2d7',
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 14,
                color: '#1d1d1f',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(224,117,53,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = '#d2d2d7')}
            />
            <button type="submit"
              style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                background: '#ffffff', border: '1px solid #d2d2d7',
                color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}>
              검색
            </button>
          </form>

          {isLoggedIn && (
            <motion.button
              onClick={() => setShowWrite(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: '#E07535', border: 'none', color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
              + 글쓰기
            </motion.button>
          )}
        </motion.div>

        {/* 검색 결과 표시 */}
        {keyword && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#6e6e73' }}>
            <span style={{ color: '#1d1d1f', fontWeight: 500 }}>"{keyword}"</span> 검색 결과{' '}
            {data ? <span style={{ color: '#E07535' }}>{data.total}건</span> : ''}
            <button
              onClick={() => { setSearchInput(''); setSearchParams(new URLSearchParams()) }}
              style={{ marginLeft: 10, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              ✕ 초기화
            </button>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: 96, borderRadius: 16,
                background: '#e5e5ea',
                border: '1px solid #d2d2d7',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : data && data.items.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.items.map((post) => (
              <motion.div
                key={post.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                <PostCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: 14 }}>
            {keyword ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40 }}>
            {page > 1 && (
              <PaginationBtn onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('page', String(page - 1)); return n })}>
                ←
              </PaginationBtn>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return (
                <PaginationBtn key={p} active={p === page}
                  onClick={() => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n })}>
                  {p}
                </PaginationBtn>
              )
            })}
            {page < totalPages && (
              <PaginationBtn onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('page', String(page + 1)); return n })}>
                →
              </PaginationBtn>
            )}
          </div>
        )}
      </div>

      {/* 글쓰기 모달 */}
      <AnimatePresence>
        {showWrite && (
          <WriteModal
            onClose={() => setShowWrite(false)}
            onSuccess={() => { setShowWrite(false); fetchPosts() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PaginationBtn({ children, onClick, active }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 8,
      background: active ? '#E07535' : '#f2f2f7',
      border: `1px solid ${active ? '#E07535' : '#d2d2d7'}`,
      color: active ? '#fff' : '#6e6e73',
      fontSize: 13, fontWeight: active ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}
