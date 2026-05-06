/**
 * WriteModal.tsx
 *
 * 블록 기반 게시글 작성 에디터
 * - 텍스트 블록과 이미지 블록을 자유롭게 배치
 * - 이미지 블록 드래그 앤 드롭으로 순서 변경
 * - 이미지 최대 5장
 * - 게시글 생성 후 이미지 순서대로 업로드
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextBlock {
  id: string
  type: 'text'
  content: string
}

interface ImageBlock {
  id: string
  type: 'image'
  file: File
  preview: string
}

type Block = TextBlock | ImageBlock

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── AutoTextarea ─────────────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(80, el.scrollHeight) + 'px'
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
        resize()
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        display: 'block',
        width: '100%',
        minHeight: 80,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontSize: 15,
        lineHeight: 1.85,
        color: '#1d1d1f',
        fontFamily: 'inherit',
        letterSpacing: '-0.01em',
        padding: 0,
        overflow: 'hidden',
      }}
    />
  )
}

// ─── ImageBlockView ───────────────────────────────────────────────────────────

function ImageBlockView({
  block,
  onRemove,
  isDragging,
  isRepresentative,
  onDragStart,
  onDragEnd,
}: {
  block: ImageBlock
  onRemove: () => void
  isDragging: boolean
  isRepresentative: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
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
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.72 : 1,
        transition: 'opacity 0.15s, box-shadow 0.25s',
        boxShadow:
          hovered && !isDragging ? '0 6px 28px rgba(0,0,0,0.13)' : 'none',
        border: isDragging
          ? '2px dashed rgba(0,113,227,0.7)'
          : '2px solid transparent',
        outline: isDragging ? '4px solid rgba(0,113,227,0.15)' : 'none',
        userSelect: 'none',
      }}
    >
      <img
        src={block.preview}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          maxHeight: 440,
          objectFit: 'cover',
          display: 'block',
          borderRadius: 14,
        }}
      />

      {/* 대표 이미지 배지 — 항상 표시, 은은하게 */}
      <AnimatePresence>
        {isRepresentative && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(0,0,0,0.38)',
              borderRadius: 20,
              padding: '4px 10px',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4da3ff', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              대표 이미지
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered && !isDragging ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.42) 0%, transparent 55%)',
          borderRadius: 14,
          pointerEvents: hovered && !isDragging ? 'auto' : 'none',
        }}
      >
        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.62)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            lineHeight: 1,
            backdropFilter: 'blur(8px)',
          }}
        >
          ×
        </button>

        {/* Drag hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(0,0,0,0.52)',
            borderRadius: 20,
            padding: '4px 10px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg
            width={11}
            height={11}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 500,
            }}
          >
            드래그하여 이동
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({
  isActive,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  isActive: boolean
  isOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  if (!isActive) return <div style={{ height: 8 }} />

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        height: isOver ? 120 : 48,
        margin: '6px 0',
        borderRadius: 12,
        border: `2px dashed ${isOver ? '#0071E3' : 'rgba(0,113,227,0.25)'}`,
        background: isOver ? 'rgba(0,113,227,0.08)' : 'rgba(0,113,227,0.03)',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <svg
        width={14}
        height={14}
        fill="none"
        stroke={isOver ? '#0071E3' : 'rgba(0,113,227,0.45)'}
        strokeWidth={2}
        viewBox="0 0 24 24"
        style={{ transition: 'stroke 0.15s', flexShrink: 0 }}
      >
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
      <span
        style={{
          fontSize: 12,
          color: isOver ? '#0071E3' : 'rgba(0,113,227,0.5)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          transition: 'color 0.15s',
        }}
      >
        여기에 놓기
      </span>
    </div>
  )
}

// ─── WriteModal ───────────────────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

type ModalAnimItem = { dx: number; dy: number; fromW: number; fromH: number; toW: number; toH: number }

export function WriteModal({
  item,
  onClose,
  onSuccess,
}: {
  item: ModalAnimItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([
    { id: genId(), type: 'text', content: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 대표 이미지 (images[0]으로 업로드되어 목록 썸네일에 표시됨)
  const [representativeId, setRepresentativeId] = useState<string | null>(null)

  // 푸터 썸네일 hover
  const [hoveredThumbId, setHoveredThumbId] = useState<string | null>(null)

  // Drag & drop
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const insertAfterRef = useRef<string | null>(null)
  const editorBodyRef = useRef<HTMLDivElement>(null)
  const dragYRef = useRef(0)
  const scrollRafRef = useRef<number | null>(null)

  const MAX_IMAGES = 5
  const imageBlocks = blocks.filter((b): b is ImageBlock => b.type === 'image')
  const imageCount = imageBlocks.length

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      blocks
        .filter((b): b is ImageBlock => b.type === 'image')
        .forEach((b) => URL.revokeObjectURL(b.preview))
    }
  }, []) // intentionally empty — runs only on unmount

  // 드래그 중 헤더·푸터 근처에서 에디터 바디 자동 스크롤
  const autoScroll = useCallback(() => {
    const body = editorBodyRef.current
    if (!body) return
    const rect = body.getBoundingClientRect()
    const y = dragYRef.current
    const ZONE = 100  // 경계로부터 스크롤 발동 거리 (px)
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

  /**
   * 블록 배열을 항상 (text (image text)*) 형태로 정규화.
   *
   * 1단계: 연속된 텍스트 블록을 하나로 병합 — 이미지 이동 후 빈 placeholder가
   *        중복으로 나타나는 원인을 제거.
   * 2단계: 이미지 앞에 텍스트 블록이 없으면 삽입.
   * 3단계: 마지막 블록이 텍스트가 아니면 추가.
   */
  const normalize = (blks: Block[]): Block[] => {
    if (!blks.length) return [{ id: genId(), type: 'text', content: '' }]

    // 1. 연속된 텍스트 블록 병합 (내용이 있으면 '\n\n'으로 이어붙임)
    const merged: Block[] = []
    for (const b of blks) {
      const prev = merged[merged.length - 1]
      if (b.type === 'text' && prev?.type === 'text') {
        const prevContent = (prev as TextBlock).content.trim()
        const nextContent = b.content.trim()
        const combined = [prevContent, nextContent].filter(Boolean).join('\n\n')
        merged[merged.length - 1] = { id: prev.id, type: 'text', content: combined }
      } else {
        merged.push(b)
      }
    }

    // 2. 이미지 앞에 텍스트 블록 보장
    const result: Block[] = []
    for (const b of merged) {
      if (b.type === 'image' && (!result.length || result[result.length - 1].type !== 'text')) {
        result.push({ id: genId(), type: 'text', content: '' })
      }
      result.push(b)
    }

    // 3. 마지막이 텍스트 블록으로 끝나도록 보장
    if (result[result.length - 1]?.type !== 'text') {
      result.push({ id: genId(), type: 'text', content: '' })
    }

    return result
  }

  // 푸터 버튼에서 호출 — 마지막 텍스트 블록 뒤에 삽입
  const triggerGlobalImageInsert = () => {
    if (imageCount >= MAX_IMAGES) return
    insertAfterRef.current = null // null = 맨 끝에 추가
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    const afterId = insertAfterRef.current
    const preview = URL.createObjectURL(file)
    const imgBlock: ImageBlock = { id: genId(), type: 'image', file, preview }

    setBlocks((prev) => {
      const next = [...prev]
      const afterIdx = afterId
        ? next.findIndex((b) => b.id === afterId)
        : next.length - 1
      next.splice((afterIdx >= 0 ? afterIdx : next.length - 1) + 1, 0, imgBlock)
      return normalize(next)
    })

    // 첫 번째 이미지면 자동으로 대표 이미지 지정
    if (imageCount === 0) setRepresentativeId(imgBlock.id)

    e.target.value = ''
  }

  const removeImage = (id: string) => {
    if (id === representativeId) {
      const remaining = imageBlocks.filter((b) => b.id !== id)
      setRepresentativeId(remaining[0]?.id ?? null)
    }
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      return normalize(next.length ? next : [{ id: genId(), type: 'text', content: '' }])
    })
  }

  const updateText = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)))
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

    setBlocks((prev) => {
      const fromIdx = prev.findIndex((b) => b.id === dragId)
      if (fromIdx === -1) return prev

      const next = [...prev]
      const [dragged] = next.splice(fromIdx, 1)

      let toIdx: number
      if (target === '__end__') {
        toIdx = next.length
      } else {
        toIdx = next.findIndex((b) => b.id === target)
        if (toIdx === -1) toIdx = next.length
      }

      next.splice(toIdx, 0, dragged)
      return normalize(next)
    })

    setDragId(null)
    setDropTarget(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  // 블록 순서대로 [IMAGE_N] 위치 마커를 포함한 content 생성
  const assembleContent = () => {
    let imgIdx = 0
    const parts: string[] = []
    for (const b of blocks) {
      if (b.type === 'text') {
        const t = (b as TextBlock).content.trim()
        if (t) parts.push(t)
      } else {
        parts.push(`[IMAGE_${imgIdx++}]`)
      }
    }
    return parts.join('\n\n')
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }

    const imageBlocks = blocks.filter((b): b is ImageBlock => b.type === 'image')
    const hasBody = imageBlocks.length > 0 ||
      blocks.some(b => b.type === 'text' && (b as TextBlock).content.trim())
    if (!hasBody) { setError('내용을 입력해주세요.'); return }

    setLoading(true)
    setError(null)

    // 대표 이미지를 업로드 순서 첫 번째로 → post.images[0] = 목록 썸네일
    const uploadOrder = [
      ...imageBlocks.filter(b => b.id === representativeId),
      ...imageBlocks.filter(b => b.id !== representativeId),
    ]
    // 업로드 순서와 블록 내 시각적 순서 간 인덱스 매핑: visualIdx → uploadIdx
    const visualToUpload = imageBlocks.map(b => uploadOrder.indexOf(b))

    const placeholderContent = assembleContent()

    try {
      // 1. 게시글 생성 (위치 마커 포함)
      const res = await api.post('/posts/', { title: title.trim(), content: placeholderContent || title.trim() })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.detail ?? '게시글 작성에 실패했습니다.')
        return
      }
      const post = await res.json()

      // 2. 이미지 업로드, 반환된 ID 수집 (대표 이미지는 is_representative=true 전달)
      const uploadedIds: (number | null)[] = new Array(uploadOrder.length).fill(null)
      for (let i = 0; i < uploadOrder.length; i++) {
        const b = uploadOrder[i]
        const isRep = b.id === representativeId
        const form = new FormData()
        form.append('file', b.file)
        try {
          const imgRes = await api.postForm(`/posts/${post.id}/images/?is_representative=${isRep}`, form)
          if (imgRes.ok) uploadedIds[i] = (await imgRes.json()).id
        } catch { /* 업로드 실패 시 무시 */ }
      }

      // 3. [IMAGE_N] → [IMAGE_ID:X] 로 교체 (시각적 순서 기준)
      let finalContent = placeholderContent
      imageBlocks.forEach((_, visualIdx) => {
        const uploadIdx = visualToUpload[visualIdx]
        const id = uploadedIds[uploadIdx]
        finalContent = finalContent.replace(
          `[IMAGE_${visualIdx}]`,
          id != null ? `[IMAGE_ID:${id}]` : ''
        )
      })
      finalContent = finalContent.replace(/\n{3,}/g, '\n\n').trim()

      // 4. 최종 content로 PATCH (이미지 ID 교체용 — 수정 이력 미표시)
      if (finalContent !== placeholderContent) {
        await api.patch(`/posts/${post.id}`, { content: finalContent || title.trim(), mark_as_edited: false })
      }

      onSuccess()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const hasBody = imageBlocks.length > 0 ||
    blocks.some(b => b.type === 'text' && (b as TextBlock).content.trim())
  const canSubmit = !!title.trim() && hasBody && !loading

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
                  새 게시글
                </h2>
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>커뮤니티에 글을 작성하세요</span>
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
                onChange={(e) => setTitle(e.target.value)}
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
                  fontFamily: FONT,
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
                  <DropZone
                    isActive={dragId !== null}
                    isOver={dropTarget === block.id}
                    onDragOver={(e) => handleZoneDragOver(e, block.id)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => handleZoneDrop(e, block.id)}
                  />
                  {block.type === 'text' ? (
                    <AutoTextarea
                      value={block.content}
                      onChange={(c) => updateText(block.id, c)}
                      placeholder={idx === 0 ? '내용을 입력하세요...' : '계속 작성하세요...'}
                    />
                  ) : (
                    <ImageBlockView
                      block={block as ImageBlock}
                      isDragging={dragId === block.id}
                      isRepresentative={block.id === representativeId}
                      onRemove={() => removeImage(block.id)}
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragEnd={handleDragEnd}
                    />
                  )}
                </div>
              ))}
              <DropZone
                isActive={dragId !== null}
                isOver={dropTarget === '__end__'}
                onDragOver={(e) => handleZoneDragOver(e, '__end__')}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleZoneDrop(e, '__end__')}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f5f5f7', minHeight: 60 }}>
              <motion.button
                onClick={triggerGlobalImageInsert}
                disabled={imageCount >= MAX_IMAGES}
                whileHover={imageCount < MAX_IMAGES ? { scale: 1.04 } : {}}
                whileTap={imageCount < MAX_IMAGES ? { scale: 0.94 } : {}}
                className="liquid"
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 10, border: 'none',
                  color: imageCount >= MAX_IMAGES ? '#c7c7cc' : '#3c3c43',
                  cursor: imageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: FONT,
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
                  {imageBlocks.map((img) => {
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
                          <img src={img.preview} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isHovered ? 0.55 : 1, transition: 'opacity 0.15s' }} />
                          {isHovered && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,113,227,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,113,227,0.82)', borderRadius: 4, padding: '2px 5px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>대표로</span>
                            </div>
                          )}
                          {isRep && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,113,227,0.88)', color: '#fff', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '2px 0', letterSpacing: '0.03em' }}>대표</div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
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

            {/* 취소 / 게시하기 행 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 26px' }}>
              <button
                onClick={onClose}
                className="liquid"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, color: '#6e6e73', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: FONT }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="liquid liquid-action"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em', fontFamily: FONT, minWidth: 82, opacity: canSubmit ? 1 : 0.4 }}
              >
                {loading ? (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'wm-spin 0.8s linear infinite', display: 'inline-block' }} />
                ) : '게시하기'}
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <style>{`@keyframes wm-spin { to { transform: rotate(360deg) } }`}</style>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
