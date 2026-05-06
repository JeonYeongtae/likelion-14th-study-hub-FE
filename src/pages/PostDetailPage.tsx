/**
 * PostDetailPage.tsx
 *
 * GET  /api/v1/posts/{id}
 * POST /api/v1/posts/{id}/like
 * GET  /api/v1/posts/{id}/comments/
 * POST /api/v1/posts/{id}/comments/   (댓글 / 대댓글)
 * PATCH/DELETE /api/v1/posts/{id}/comments/{cid}
 * PATCH/DELETE /api/v1/posts/{id}
 * POST   /api/v1/posts/{id}/images    (이미지 추가)
 * DELETE /api/v1/posts/{id}/images/{img_id}  (이미지 삭제)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import type { PostImageResponse, PostResponse, CommentResponse } from '../types/api'

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Edit block types ─────────────────────────────────────────────────────────

type EditTextBlock = { id: string; type: 'text'; content: string }
type EditServerImageBlock = { id: string; type: 'server-image'; imageId: number; imageUrl: string }
type EditNewImageBlock = { id: string; type: 'new-image'; file: File; preview: string }
type EditBlock = EditTextBlock | EditServerImageBlock | EditNewImageBlock

function normalizeEditBlocks(blks: EditBlock[]): EditBlock[] {
  if (!blks.length) return [{ id: genId(), type: 'text', content: '' }]

  // 연속된 텍스트 블록 병합
  const merged: EditBlock[] = []
  for (const b of blks) {
    const prev = merged[merged.length - 1]
    if (b.type === 'text' && prev?.type === 'text') {
      const combined = [(prev as EditTextBlock).content.trim(), b.content.trim()].filter(Boolean).join('\n\n')
      merged[merged.length - 1] = { id: prev.id, type: 'text', content: combined }
    } else {
      merged.push(b)
    }
  }

  // 이미지 앞에 텍스트 블록 보장
  const result: EditBlock[] = []
  for (const b of merged) {
    if (b.type !== 'text' && (!result.length || result[result.length - 1].type !== 'text')) {
      result.push({ id: genId(), type: 'text', content: '' })
    }
    result.push(b)
  }

  // 마지막 블록은 텍스트
  if (result[result.length - 1]?.type !== 'text') {
    result.push({ id: genId(), type: 'text', content: '' })
  }

  return result
}

// content의 [IMAGE_ID:X] 마커를 파싱해 블록 순서를 복원
function createEditInitialState(post: PostResponse) {
  const imageMap = new Map((post.images ?? []).map(img => [img.id, img]))
  const IMAGE_MARKER = /(\[IMAGE_ID:\d+\])/

  const parts = post.content.split(IMAGE_MARKER)
  const blocks: EditBlock[] = []

  for (const part of parts) {
    const match = part.match(/^\[IMAGE_ID:(\d+)\]$/)
    if (match) {
      const id = parseInt(match[1])
      const img = imageMap.get(id)
      if (img) blocks.push({ id: genId(), type: 'server-image', imageId: img.id, imageUrl: img.image_url })
    } else {
      const text = part.replace(/^\n+|\n+$/g, '')
      if (text.trim()) blocks.push({ id: genId(), type: 'text', content: text })
    }
  }

  // 마커 없는 구형 게시글 처리: 이미지는 하단에 배치
  if (!blocks.some(b => b.type === 'server-image') && (post.images ?? []).length > 0) {
    if (!blocks.length || blocks[blocks.length - 1].type !== 'text') {
      blocks.push({ id: genId(), type: 'text', content: post.content })
    }
    for (const img of post.images ?? []) {
      blocks.push({ id: genId(), type: 'server-image', imageId: img.id, imageUrl: img.image_url })
    }
  }

  if (!blocks.length) blocks.push({ id: genId(), type: 'text', content: '' })

  const normalized = normalizeEditBlocks(blocks)

  // is_representative=true 인 서버 이미지 블록을 대표로 설정
  const repImageId = (post.images ?? []).find(img => img.is_representative)?.id ?? null
  const repBlock = repImageId != null
    ? normalized.find(b => b.type === 'server-image' && (b as EditServerImageBlock).imageId === repImageId)
    : null
  const representativeId = repBlock?.id ?? normalized.find(b => b.type !== 'text')?.id ?? null

  return { blocks: normalized, representativeId }
}

// ─── AutoTextarea ─────────────────────────────────────────────────────────────

function AutoTextarea({
  value, onChange, placeholder, autoFocus,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(80, el.scrollHeight) + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); resize() }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        display: 'block', width: '100%', minHeight: 80,
        background: 'transparent', border: 'none', outline: 'none',
        resize: 'none', fontSize: 15, lineHeight: 1.85, color: '#1d1d1f',
        fontFamily: 'inherit', letterSpacing: '-0.01em', padding: 0, overflow: 'hidden',
      }}
    />
  )
}

// ─── EditImageBlockView ───────────────────────────────────────────────────────

function EditImageBlockView({
  src, onRemove, isDragging, isRepresentative, onDragStart, onDragEnd,
}: {
  src: string; onRemove: () => void; isDragging: boolean; isRepresentative: boolean;
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.72 : 1,
        transition: 'opacity 0.15s, box-shadow 0.25s',
        boxShadow: hovered && !isDragging ? '0 6px 28px rgba(0,0,0,0.13)' : 'none',
        border: isDragging ? '2px dashed rgba(0,113,227,0.7)' : '2px solid transparent',
        outline: isDragging ? '4px solid rgba(0,113,227,0.15)' : 'none',
        userSelect: 'none',
      }}
    >
      <img
        src={src} alt="" draggable={false}
        style={{ width: '100%', maxHeight: 440, objectFit: 'cover', display: 'block', borderRadius: 14 }}
      />

      {/* 대표 이미지 배지 */}
      <AnimatePresence>
        {isRepresentative && (
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', top: 12, left: 12,
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.38)', borderRadius: 20, padding: '4px 10px',
              backdropFilter: 'blur(8px)', pointerEvents: 'none',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4da3ff', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              대표 이미지
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 호버 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered && !isDragging ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.42) 0%, transparent 55%)',
          borderRadius: 14,
          pointerEvents: hovered && !isDragging ? 'auto' : 'none',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(0,0,0,0.62)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, lineHeight: 1, backdropFilter: 'blur(8px)',
          }}
        >×</button>
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,0.52)', borderRadius: 20, padding: '4px 10px', backdropFilter: 'blur(8px)',
        }}>
          <svg width={11} height={11} fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>드래그하여 이동</span>
        </div>
      </motion.div>
    </div>
  )
}

// ─── EditDropZone ─────────────────────────────────────────────────────────────

function EditDropZone({
  isActive, isOver, onDragOver, onDragLeave, onDrop,
}: {
  isActive: boolean; isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  if (!isActive) return <div style={{ height: 8 }} />

  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        height: isOver ? 120 : 48, margin: '6px 0', borderRadius: 12,
        border: `2px dashed ${isOver ? '#0071E3' : 'rgba(0,113,227,0.25)'}`,
        background: isOver ? 'rgba(0,113,227,0.08)' : 'rgba(0,113,227,0.03)',
        transition: 'all 0.15s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      <svg width={14} height={14} fill="none"
        stroke={isOver ? '#0071E3' : 'rgba(0,113,227,0.45)'} strokeWidth={2} viewBox="0 0 24 24"
        style={{ transition: 'stroke 0.15s', flexShrink: 0 }}>
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
      <span style={{ fontSize: 12, color: isOver ? '#0071E3' : 'rgba(0,113,227,0.5)', fontWeight: 600, letterSpacing: '-0.01em', transition: 'color 0.15s' }}>
        여기에 놓기
      </span>
    </div>
  )
}

// ─── EditModal ────────────────────────────────────────────────────────────────

type EditModalAnimItem = { dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }

const EDIT_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

function EditModal({
  post, item, onClose, onSuccess,
}: {
  post: PostResponse; item: EditModalAnimItem; onClose: () => void; onSuccess: () => void
}) {
  const postId = post.id

  const [title, setTitle] = useState(post.title)
  // createEditInitialState를 한 번만 호출해 blocks와 representativeId의 ID가 일치하도록 보장
  const [initState] = useState(() => createEditInitialState(post))
  const [blocks, setBlocks] = useState<EditBlock[]>(initState.blocks)
  const [representativeId, setRepresentativeId] = useState<string | null>(initState.representativeId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredThumbId, setHoveredThumbId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const insertAfterRef = useRef<string | null>(null)
  const editorBodyRef = useRef<HTMLDivElement>(null)
  const dragYRef = useRef(0)
  const scrollRafRef = useRef<number | null>(null)

  const MAX_IMAGES = 5
  const imageBlocks = blocks.filter(b => b.type === 'server-image' || b.type === 'new-image')
  const imageCount = imageBlocks.length

  // 바디 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 새 이미지 Object URL 정리
  useEffect(() => {
    return () => {
      blocks
        .filter((b): b is EditNewImageBlock => b.type === 'new-image')
        .forEach(b => URL.revokeObjectURL(b.preview))
    }
  }, []) // 언마운트 시에만 실행

  // 드래그 중 헤더·푸터 근처에서 에디터 바디 자동 스크롤
  const autoScroll = useCallback(() => {
    const body = editorBodyRef.current
    if (!body) return
    const rect = body.getBoundingClientRect()
    const y = dragYRef.current
    const ZONE = 100
    const MAX_SPEED = 14
    let speed = 0
    if (y < rect.top + ZONE) {
      speed = -MAX_SPEED * Math.max(0, (ZONE - (y - rect.top)) / ZONE)
    } else if (y > rect.bottom - ZONE) {
      speed = MAX_SPEED * Math.max(0, (ZONE - (rect.bottom - y)) / ZONE)
    }
    if (speed !== 0) body.scrollTop += speed
    scrollRafRef.current = requestAnimationFrame(autoScroll)
  }, [])

  useEffect(() => {
    if (!dragId) {
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
      return
    }
    const onMove = (e: DragEvent) => { dragYRef.current = e.clientY }
    document.addEventListener('dragover', onMove)
    scrollRafRef.current = requestAnimationFrame(autoScroll)
    return () => {
      document.removeEventListener('dragover', onMove)
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    }
  }, [dragId, autoScroll])

  // ── Block helpers ──────────────────────────────────────────────────────────

  const triggerImageInsert = () => {
    if (imageCount >= MAX_IMAGES) return
    insertAfterRef.current = null
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    const afterId = insertAfterRef.current
    const preview = URL.createObjectURL(file)
    const imgBlock: EditNewImageBlock = { id: genId(), type: 'new-image', file, preview }

    setBlocks(prev => {
      const next = [...prev]
      const afterIdx = afterId ? next.findIndex(b => b.id === afterId) : next.length - 1
      next.splice((afterIdx >= 0 ? afterIdx : next.length - 1) + 1, 0, imgBlock)
      return normalizeEditBlocks(next)
    })

    if (imageCount === 0) setRepresentativeId(imgBlock.id)
    e.target.value = ''
  }

  const removeBlock = (id: string) => {
    if (id === representativeId) {
      const remaining = imageBlocks.filter(b => b.id !== id)
      setRepresentativeId(remaining[0]?.id ?? null)
    }
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id)
      return normalizeEditBlocks(next.length ? next : [{ id: genId(), type: 'text', content: '' }])
    })
  }

  const updateText = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDropTarget(null)
  }

  const handleZoneDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }

  const handleZoneDrop = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    if (!dragId) return

    setBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === dragId)
      if (fromIdx === -1) return prev
      const next = [...prev]
      const [dragged] = next.splice(fromIdx, 1)
      let toIdx = target === '__end__' ? next.length : next.findIndex(b => b.id === target)
      if (toIdx === -1) toIdx = next.length
      next.splice(toIdx, 0, dragged)
      return normalizeEditBlocks(next)
    })

    setDragId(null)
    setDropTarget(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  // 블록 순서대로 content 생성:
  // - 서버 이미지 → [IMAGE_ID:X] (이미 DB에 존재)
  // - 새 이미지   → [IMAGE_NEW_N] (업로드 후 교체)
  const assembleContent = () => {
    let newIdx = 0
    const parts: string[] = []
    for (const b of blocks) {
      if (b.type === 'text') {
        const t = (b as EditTextBlock).content.trim()
        if (t) parts.push(t)
      } else if (b.type === 'server-image') {
        parts.push(`[IMAGE_ID:${(b as EditServerImageBlock).imageId}]`)
      } else {
        parts.push(`[IMAGE_NEW_${newIdx++}]`)
      }
    }
    return parts.join('\n\n')
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }

    const hasBody = blocks.some(b =>
      (b.type === 'text' && (b as EditTextBlock).content.trim()) || b.type !== 'text'
    )
    if (!hasBody) { setError('내용을 입력해주세요.'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. 제거된 서버 이미지 삭제
      const remainingServerIds = new Set(
        blocks.filter(b => b.type === 'server-image').map(b => (b as EditServerImageBlock).imageId)
      )
      for (const img of post.images ?? []) {
        if (!remainingServerIds.has(img.id)) {
          await api.delete(`/posts/${postId}/images/${img.id}`)
        }
      }

      // 2. 새 이미지 업로드, 반환된 ID 수집 (대표 이미지는 is_representative=true 전달)
      const newImages = blocks.filter((b): b is EditNewImageBlock => b.type === 'new-image')
      const newIdByVisualIdx = new Map<number, number>()
      for (const b of newImages) {
        const isRep = b.id === representativeId
        const form = new FormData()
        form.append('file', b.file)
        try {
          const res = await api.postForm(`/posts/${postId}/images/?is_representative=${isRep}`, form)
          if (res.ok) {
            const data = await res.json()
            const visualIdx = newImages.indexOf(b)
            newIdByVisualIdx.set(visualIdx, data.id)
          }
        } catch { /* 업로드 실패 무시 */ }
      }

      // 3. 대표 이미지가 서버 이미지(기존)인 경우 set-representative API 호출
      const repBlock = blocks.find(b => b.id === representativeId)
      if (repBlock?.type === 'server-image') {
        const repImageId = (repBlock as EditServerImageBlock).imageId
        await api.patch(`/posts/${postId}/images/${repImageId}/set-representative`)
      }

      // 4. [IMAGE_NEW_N] → [IMAGE_ID:X] 로 교체
      let finalContent = assembleContent()
      newImages.forEach((_, visualIdx) => {
        const id = newIdByVisualIdx.get(visualIdx)
        finalContent = finalContent.replace(
          `[IMAGE_NEW_${visualIdx}]`,
          id != null ? `[IMAGE_ID:${id}]` : ''
        )
      })
      finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim()

      // 5. 제목 + 최종 content PATCH
      const res = await api.patch(`/posts/${postId}`, {
        title: title.trim(),
        content: finalContent || title.trim(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? '게시글 수정에 실패했습니다.')
        return
      }

      onSuccess()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const hasBody = blocks.some(b =>
    (b.type === 'text' && (b as EditTextBlock).content.trim()) || b.type !== 'text'
  )
  const canSave = !!title.trim() && hasBody && !loading

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: EDIT_FONT,
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
          {/* ── Header ── */}
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0071E3', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Community</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', margin: '0 0 4px' }}>
                  게시글 수정
                </h2>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>게시글을 수정하세요</span>
              </div>
            </div>
          </div>

          {/* ── Editor Body ── */}
          <div
            ref={editorBodyRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px 36px 24px',
              background: 'rgba(248, 248, 250, 0.5)',
            }}
          >
            {/* Title */}
            <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '14px 18px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)', marginBottom: 14 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={100}
                autoFocus
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#1d1d1f',
                  fontFamily: EDIT_FONT,
                  letterSpacing: '-0.02em',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#c7c7cc', letterSpacing: '0.01em' }}>{title.length}/100</span>
              </div>
            </div>

            {/* Content blocks */}
            <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.7)', borderLeft: '4px solid #0071E3', borderRadius: '0 12px 12px 0', padding: '14px 18px', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.05)', flex: 1 }}>
              {blocks.map((block, idx) => (
                <div key={block.id}>
                  <EditDropZone
                    isActive={dragId !== null}
                    isOver={dropTarget === block.id}
                    onDragOver={e => handleZoneDragOver(e, block.id)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={e => handleZoneDrop(e, block.id)}
                  />
                  {block.type === 'text' ? (
                    <AutoTextarea
                      value={(block as EditTextBlock).content}
                      onChange={c => updateText(block.id, c)}
                      placeholder={idx === 0 ? '내용을 입력하세요...' : '계속 작성하세요...'}
                    />
                  ) : (
                    <EditImageBlockView
                      src={block.type === 'server-image'
                        ? (block as EditServerImageBlock).imageUrl
                        : (block as EditNewImageBlock).preview
                      }
                      isDragging={dragId === block.id}
                      isRepresentative={block.id === representativeId}
                      onRemove={() => removeBlock(block.id)}
                      onDragStart={e => handleDragStart(e, block.id)}
                      onDragEnd={handleDragEnd}
                    />
                  )}
                </div>
              ))}
              <EditDropZone
                isActive={dragId !== null}
                isOver={dropTarget === '__end__'}
                onDragOver={e => handleZoneDragOver(e, '__end__')}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => handleZoneDrop(e, '__end__')}
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(0,0,0,0.07)',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            {/* 사진 + 썸네일 행 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', minHeight: 60 }}>
              <motion.button
                onClick={triggerImageInsert}
                disabled={imageCount >= MAX_IMAGES}
                whileHover={imageCount < MAX_IMAGES ? { scale: 1.04 } : {}}
                whileTap={imageCount < MAX_IMAGES ? { scale: 0.94 } : {}}
                className="liquid"
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 10, border: 'none',
                  color: imageCount >= MAX_IMAGES ? '#c7c7cc' : '#3c3c43',
                  cursor: imageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: EDIT_FONT,
                  opacity: imageCount >= MAX_IMAGES ? 0.5 : 1,
                }}
              >
                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2.5" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                사진 추가
              </motion.button>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                <AnimatePresence initial={false}>
                  {imageBlocks.map(img => {
                    const src = img.type === 'server-image'
                      ? (img as EditServerImageBlock).imageUrl
                      : (img as EditNewImageBlock).preview
                    const isRep = img.id === representativeId
                    const isHovered = hoveredThumbId === img.id && !isRep
                    return (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.65 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.65 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        style={{ position: 'relative', flexShrink: 0 }}
                        title={isRep ? '대표 이미지' : '클릭하여 대표 이미지로 설정'}
                      >
                        <div
                          onClick={() => { if (!isRep) setRepresentativeId(img.id) }}
                          onMouseEnter={() => setHoveredThumbId(img.id)}
                          onMouseLeave={() => setHoveredThumbId(null)}
                          style={{
                            width: 52, height: 52, borderRadius: 10, overflow: 'hidden', position: 'relative',
                            cursor: isRep ? 'default' : 'pointer',
                            border: isRep ? '2.5px solid #0071E3' : '2px solid rgba(0,0,0,0.07)',
                            boxShadow: isRep ? '0 0 0 3px rgba(0,113,227,0.18)' : 'none',
                            transition: 'border 0.15s, box-shadow 0.15s', flexShrink: 0,
                          }}
                        >
                          <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isHovered ? 0.55 : 1, transition: 'opacity 0.15s' }} />
                          {isHovered && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,113,227,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,113,227,0.82)', borderRadius: 4, padding: '2px 5px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>대표로</span>
                            </div>
                          )}
                          {isRep && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,113,227,0.88)', color: '#fff', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '2px 0', letterSpacing: '0.03em' }}>대표</div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeBlock(img.id) }}
                            style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, backdropFilter: 'blur(4px)' }}
                          >×</button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {imageCount === 0 && (
                  <span style={{ fontSize: 12, color: '#c7c7cc' }}>사진은 최대 5장까지 첨부할 수 있습니다</span>
                )}
              </div>

              <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.span key="err" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ fontSize: 12, color: '#ff3b30' }}>{error}</motion.span>
                  ) : imageCount > 0 ? (
                    <motion.span key="cnt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: 12, fontWeight: 600, color: imageCount >= MAX_IMAGES ? '#ff9500' : '#0071E3' }}>{imageCount}/{MAX_IMAGES}</motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* 취소 / 저장하기 행 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 26px' }}>
              <button
                onClick={onClose}
                className="liquid"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, color: '#6e6e73', cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: EDIT_FONT }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="liquid liquid-action"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em', fontFamily: EDIT_FONT, minWidth: 82, opacity: canSave ? 1 : 0.4 }}
              >
                {loading ? (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'em-spin 0.8s linear infinite', display: 'inline-block' }} />
                ) : '저장하기'}
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <style>{`@keyframes em-spin { to { transform: rotate(360deg) } }`}</style>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, cursor: 'zoom-out',
      }}
    >
      <motion.img src={src} alt=""
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      />
      <button onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          fontSize: 22, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ display: 'block', lineHeight: 1 }}>×</span>
      </button>
    </motion.div>
  )
}

// ─── InlinePostContent ────────────────────────────────────────────────────────
// [IMAGE_ID:X] 마커를 파싱해 텍스트-이미지를 순서대로 렌더링.
// 마커가 없는 구형 게시글은 텍스트 → 이미지 순으로 fallback.

function InlinePostContent({ content, images }: { content: string; images: PostImageResponse[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const imageMap = new Map(images.map(img => [img.id, img]))
  const hasMarkers = /\[IMAGE_ID:\d+\]/.test(content)

  const parts = content.split(/(\[IMAGE_ID:\d+\])/)

  return (
    <>
      {hasMarkers ? (
        parts.map((part, i) => {
          const match = part.match(/^\[IMAGE_ID:(\d+)\]$/)
          if (match) {
            const img = imageMap.get(parseInt(match[1]))
            if (!img) return null
            return (
              <div key={i}
                onClick={() => setLightbox(img.image_url)}
                style={{ margin: '20px 0', borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', background: '#f2f2f7' }}>
                <img src={img.image_url} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', transition: 'transform 0.25s ease' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.02)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                />
              </div>
            )
          }
          const text = part.replace(/^\n+|\n+$/g, '')
          if (!text.trim()) return null
          return (
            <div key={i} style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {text}
            </div>
          )
        })
      ) : (
        <>
          <div style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </div>
          {images.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {images.map(img => (
                <div key={img.id}
                  onClick={() => setLightbox(img.image_url)}
                  style={{ borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', background: '#f2f2f7' }}>
                  <img src={img.image_url} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', transition: 'transform 0.25s ease' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.02)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </>
  )
}

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

function CommentItem({
  comment, postId, myId, onRefresh,
}: {
  comment: CommentResponse; postId: number; myId: number | undefined; onRefresh: () => void
}) {
  const { showConfirm } = useAlert()
  const isOwner = myId === comment.user_id
  const [deleted, setDeleted] = useState(comment.is_deleted)
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
    const res = await api.delete(`/posts/${postId}/comments/${comment.id}`)
    if (res.ok) setDeleted(true)
  }

  const handleReply = async () => {
    if (isSubmitting) return
    if (!replyContent.trim()) return
    setIsSubmitting(true)
    try {
      const res = await api.post(`/posts/${postId}/comments/`, { content: replyContent, parent_comment_id: comment.id })
      if (res.ok) { setReplying(false); setReplyContent(''); onRefresh() }
    } catch {
      // network error
    } finally {
      setIsSubmitting(false)
    }
  }

  const isReply = comment.parent_comment_id !== null

  if (deleted) {
    const avatarSize = isReply ? 22 : 28
    return (
      <div style={{ padding: isReply ? '8px 0 8px 2px' : '14px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: '#e5e5ea', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#aeaeb2' }}>{formatDate(comment.created_at)}</span>
        </div>
        <p style={{ fontSize: 14, color: '#aeaeb2', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>삭제된 댓글입니다.</p>
      </div>
    )
  }
  const displayName = comment.nickname || `user_${comment.user_id}`
  const avatarInitial = displayName.charAt(0).toUpperCase()
  const avatarHue = (comment.user_id * 37) % 360

  return (
    <div>
      <div style={{ padding: isReply ? '8px 0 8px 2px' : '14px 0 10px', background: 'transparent', marginBottom: 0 }}>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{displayName}</span>
            <span style={{ fontSize: 11, color: '#aeaeb2' }}>{formatDate(comment.created_at)}</span>
            {comment.updated_at && <span style={{ fontSize: 11, color: '#aeaeb2' }}>(수정됨)</span>}
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button onClick={() => setEditing(true)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                style={{ fontSize: 12, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>수정</motion.button>
              <motion.button onClick={handleDelete} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                style={{ fontSize: 12, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>삭제</motion.button>
            </div>
          )}
        </div>

        {/* 본문 or 수정 폼 */}
        <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div key="edit-form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', margin: '0 -12px', padding: '0 12px' }}>
              <div
                className="liquid"
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, borderRadius: 28, padding: '6px 6px 6px 18px' }}
              >
                <input value={editContent} onChange={e => setEditContent(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate() } }}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit', padding: '4px 8px', letterSpacing: '-0.01em' }}
                />
                <motion.button onClick={handleUpdate} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                  className="liquid liquid-action"
                  style={{ padding: '7px 16px', borderRadius: 22, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>저장</motion.button>
                <motion.button onClick={() => { setEditing(false); setEditContent(comment.content) }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                  className="liquid"
                  style={{ padding: '7px 14px', borderRadius: 22, fontSize: 13, border: 'none', color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>취소</motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.p key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.65, margin: 0 }}>
              {comment.content}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 대댓글 버튼 */}
        {!isReply && myId && !editing && (
          <motion.button onClick={() => setReplying(!replying)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            style={{ marginTop: 8, fontSize: 12, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {replying ? '취소' : '↩ 답글'}
          </motion.button>
        )}

        {/* 대댓글 입력 */}
        <AnimatePresence>
          {replying && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', marginTop: 8 }}>
              <div
                className="liquid"
                style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 28, padding: '6px 6px 6px 18px' }}
              >
                <input value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="답글을 입력하세요..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit', padding: '4px 8px', letterSpacing: '-0.01em' }}
                />
                <motion.button onClick={handleReply} disabled={isSubmitting}
                  whileHover={!isSubmitting ? { scale: 1.04 } : {}} whileTap={!isSubmitting ? { scale: 0.93 } : {}}
                  className="liquid liquid-action"
                  style={{ padding: '7px 16px', borderRadius: 22, fontSize: 13, fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', minWidth: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', opacity: isSubmitting ? 0.6 : 1 }}>
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
  const [editing, setEditing] = useState<EditModalAnimItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const fetchPost = useCallback(async () => {
    const res = await api.get(`/posts/${postId}`)
    if (res.ok) {
      const p = await res.json()
      setPost(p)
      setLiked(p.is_liked ?? false)
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
    if (!isLoggedIn) {
      if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
      navigate('/auth')
      return
    }
    const res = await api.post(`/posts/${postId}/like`)
    if (res.ok) setLiked(!liked)
  }

  const handleComment = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
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

  const handleDeletePost = async () => {
    if (!(await showConfirm('게시글을 삭제하시겠습니까?'))) return
    const res = await api.delete(`/posts/${postId}`)
    if (res.ok) navigate('/community')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #e5e5ea', borderTopColor: '#0071E3', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6e6e73' }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>게시글을 찾을 수 없습니다.</p>
          <motion.button onClick={() => navigate('/community')} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            style={{ color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            목록으로 돌아가기
          </motion.button>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === post.user_id

  const topComments = comments.filter(c => c.parent_comment_id === null)
  const replyMap: Record<number, CommentResponse[]> = {}
  comments.filter(c => c.parent_comment_id !== null).forEach(c => {
    const pid = c.parent_comment_id!
    if (!replyMap[pid]) replyMap[pid] = []
    replyMap[pid].push(c)
  })

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f7', paddingTop: 80,
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
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: '#ffffff', border: '1px solid #e5e5ea', borderRadius: 20, padding: '32px', marginBottom: 24 }}>

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

          {/* 본문 + 이미지 인라인 */}
          <div style={{ marginBottom: 32, borderBottom: '1px solid #f2f2f7', paddingBottom: 32 }}>
            <InlinePostContent content={post.content} images={post.images ?? []} />
          </div>

          {/* 좋아요 + 수정/삭제 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              onClick={handleLike}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
              className="liquid"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 999, border: 'none',
                color: liked ? '#ff3b30' : '#6e6e73',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                ...(liked ? {
                  boxShadow: '0 0 0 1.5px rgba(255,59,48,0.28) inset, 0 2px 12px rgba(255,59,48,0.10), 0 1px 3px rgba(255,59,48,0.08)',
                } : {}),
              }}>
              <motion.span
                key={liked ? 'filled' : 'empty'}
                initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                {liked ? '♥' : '♡'}
              </motion.span>
              좋아요
            </motion.button>

            {isOwner && (
              <>
                <motion.button
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                    const toW = Math.min(window.innerWidth - 48, 720)
                    const toH = window.innerHeight - 160
                    setEditing({
                      dx: (rect.left + rect.width / 2) - window.innerWidth / 2,
                      dy: (rect.top + rect.height / 2) - window.innerHeight / 2,
                      fromW: rect.width,
                      fromH: rect.height,
                      toW,
                      toH,
                    })
                  }}
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
        </motion.div>

        {/* 댓글 영역 */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e5ea', borderRadius: 20, padding: '28px 32px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: 16 }}>
            댓글 {comments.length}
          </h2>

          {topComments.map(comment => {
            const replies = replyMap[comment.id] ?? []
            return (
              <div key={comment.id} style={{ borderBottom: '1px solid #f2f2f7' }}>
                <CommentItem comment={comment} postId={postId} myId={user?.id} onRefresh={fetchComments} />
                {replies.length > 0 && (
                  <div style={{ marginLeft: 14, paddingLeft: 22, borderLeft: '2px solid #e5e5ea', marginBottom: 8 }}>
                    {replies.map(reply => (
                      <CommentItem key={reply.id} comment={reply} postId={postId} myId={user?.id} onRefresh={fetchComments} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {comments.length === 0 && (
            <p style={{ fontSize: 14, color: '#aeaeb2', padding: '16px 0' }}>첫 댓글을 남겨보세요.</p>
          )}

          {/* 댓글 입력 */}
          {isLoggedIn ? (
            <form
              onSubmit={handleComment}
              className="liquid"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                borderRadius: 28, padding: '6px 6px 6px 18px', marginTop: 24,
              }}
            >
              <input
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="댓글을 입력하세요..."
                disabled={isSubmitting}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit',
                  padding: '4px 8px', letterSpacing: '-0.01em',
                  cursor: isSubmitting ? 'not-allowed' : 'text',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              />
              <motion.button type="submit"
                disabled={!commentInput.trim() || isSubmitting}
                whileHover={commentInput.trim() && !isSubmitting ? { scale: 1.04 } : {}}
                whileTap={commentInput.trim() && !isSubmitting ? { scale: 0.94 } : {}}
                className="liquid liquid-action"
                style={{
                  padding: '7px 18px', borderRadius: 22, fontSize: 14, fontWeight: 600,
                  border: 'none',
                  cursor: (commentInput.trim() && !isSubmitting) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', minWidth: 64,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (commentInput.trim() && !isSubmitting) ? 1 : 0.45,
                  whiteSpace: 'nowrap',
                }}>
                {isSubmitting
                  ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  : '작성'}
              </motion.button>
            </form>
          ) : (
            <motion.button
              onClick={async () => {
                if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
                navigate('/auth')
              }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="liquid"
              style={{
                marginTop: 24, width: '100%', padding: '12px', borderRadius: 24,
                border: 'none', color: '#aeaeb2', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              댓글을 작성하려면 로그인하세요
            </motion.button>
          )}
        </div>
      </div>

      {/* 수정 모달 */}
      <AnimatePresence>
        {editing && post && (
          <EditModal
            post={post}
            item={editing}
            onClose={() => setEditing(null)}
            onSuccess={() => { setEditing(null); fetchPost() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
