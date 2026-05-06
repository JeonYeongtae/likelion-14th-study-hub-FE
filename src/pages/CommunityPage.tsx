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
import Pagination from '../components/Pagination'
import { WriteModal } from '../components/WriteModal'
import CategorySelector from '../components/liquid-glass/CategorySelector'

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
  const thumbnail = (
    post.images?.find(img => img.is_representative) ?? post.images?.[0]
  )?.image_url ?? null

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
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
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
      {/* 텍스트 영역 */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
          WebkitLineClamp: thumbnail ? 1 : 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {post.content.replace(/\[IMAGE_ID:\d+\]\n*/g, '').trim()}
        </p>

        {/* 메타 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#aeaeb2', flexWrap: 'wrap' }}>
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
      </div>

      {/* 대표 이미지 썸네일 */}
      {thumbnail && (
        <div style={{
          flexShrink: 0,
          width: 80,
          height: 80,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#f2f2f7',
          alignSelf: 'center',
        }}>
          <img
            src={thumbnail}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
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

  type WriteItem = { dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }

  type SortKey = 'latest' | 'popular'

  const [data, setData] = useState<PostListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(keyword)
  const [writeItem, setWriteItem] = useState<WriteItem | null>(null)
  const sortKey = (searchParams.get('sort') ?? 'latest') as SortKey

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

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const isFirstLoad = useRef(true)
  useEffect(() => {
    if (loading) return
    if (isFirstLoad.current) { isFirstLoad.current = false; return }
    const start = window.scrollY
    if (start === 0) return
    const duration = 500
    const startTime = performance.now()
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    let raf: number
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      window.scrollTo(0, start * (1 - easeOutCubic(progress)))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [loading])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (searchInput.trim()) p.set('keyword', searchInput.trim())
    p.set('page', '1')
    setSearchParams(p)
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'latest',  label: '최신순' },
    { key: 'popular', label: '인기순' },
  ]

  const sortedItems = data
    ? [...data.items].sort((a, b) =>
        sortKey === 'popular'
          ? (b.view_count ?? 0) - (a.view_count ?? 0)
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : []

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
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#0071E3' }}>
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

          {/* 검색 폼 — liquid glass 컨테이너 */}
          <form
            onSubmit={handleSearch}
            className="liquid"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 28,
              padding: '6px 6px 6px 18px',
              gap: 4,
            }}
          >
            {/* 돋보기 아이콘 */}
            <svg
              width={15} height={15} viewBox="0 0 24 24"
              fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={2.2}
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>

            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목, 내용, 닉네임으로 검색"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: '#1d1d1f',
                fontFamily: 'inherit',
                padding: '4px 8px',
                letterSpacing: '-0.01em',
              }}
            />

            {/* 검색 버튼 */}
            <button
              type="submit"
              className="liquid liquid-accent"
              style={{
                padding: '7px 16px',
                borderRadius: 22,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}
            >
              검색
            </button>
          </form>

          {isLoggedIn && (
            <motion.button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                const toW = Math.min(window.innerWidth - 32, 720)
                const toH = window.innerHeight - 80 * 2
                setWriteItem({
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
              style={{
                padding: '10px 20px', borderRadius: 22, fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', letterSpacing: '-0.01em',
              }}>
              + 글쓰기
            </motion.button>
          )}
        </motion.div>

        {/* 정렬 필터 */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 20 }}>
            <CategorySelector
              theme="light"
              selected={sortKey}
              onSelect={(id) => {
              const p = new URLSearchParams(searchParams)
              p.set('sort', id)
              p.set('page', '1')
              setSearchParams(p)
            }}
              categories={SORT_OPTIONS.map(opt => ({ id: opt.key, label: opt.label }))}
            />
          </motion.div>
        )}

        {/* 검색 결과 표시 */}
        {keyword && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#6e6e73' }}>
            <span style={{ color: '#1d1d1f', fontWeight: 500 }}>"{keyword}"</span> 검색 결과{' '}
            {data ? <span style={{ color: '#0071E3' }}>{data.total}건</span> : ''}
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
        ) : sortedItems.length > 0 ? (
          <motion.div
            key={sortKey}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedItems.map((post) => (
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
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={p => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n })}
            style={{ marginTop: 40 }}
          />
        )}
      </div>

      {/* 글쓰기 모달 */}
      <AnimatePresence>
        {writeItem && (
          <WriteModal
            item={writeItem}
            onClose={() => setWriteItem(null)}
            onSuccess={() => { setWriteItem(null); fetchPosts() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
