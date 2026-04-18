/**
 * CategorySelector
 *
 * Animated category tab strip with Liquid Glass active indicator.
 * Uses framer-motion layoutId so the indicator slides between tabs
 * with a spring animation. Hover triggers a subtle glass glow.
 *
 * Drag-to-snap: dragging the strip left/right auto-selects the nearest
 * category based on pointer position. On release the strip springs back
 * to x=0, committing the selection.
 *
 * theme prop:
 *   'dark'  (default) — for dark/blurred backgrounds
 *   'light' — for white/light page backgrounds (uses dark text + orange active tint)
 */

import { useState, useRef } from 'react'
import { motion, LayoutGroup, useMotionValue, useSpring } from 'framer-motion'
import LiquidGlassBase from './LiquidGlassBase'
import type { CategorySelectorProps } from '../../types'

export default function CategorySelector({
  categories,
  selected,
  onSelect,
  className = '',
  theme = 'dark',
}: CategorySelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [liveSelected, setLiveSelected] = useState<string>(selected)
  const [isDragging, setIsDragging] = useState(false)

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Spring-driven x position — snaps back to 0 on drag end
  const x = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 400, damping: 35, mass: 0.6 })

  function getNearestId(clientX: number): string {
    let nearest = categories[0].id
    let minDist = Infinity
    buttonRefs.current.forEach((btn, i) => {
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const dist = Math.abs(clientX - center)
      if (dist < minDist) {
        minDist = dist
        nearest = categories[i].id
      }
    })
    return nearest
  }

  const activeId = isDragging ? liveSelected : selected

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const isLight = theme === 'light'

  const containerBg   = isLight ? 'rgba(0,0,0,0.04)'            : 'rgba(255,255,255,0.06)'
  const containerBorder = isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.1)'
  const activeColor   = isLight ? '#1d1d1f'                      : '#ffffff'
  const inactiveColor = isLight ? '#6e6e73'                      : 'rgba(255,255,255,0.45)'
  const activeTint    = isLight
    ? 'rgba(224, 117, 53, 0.15)'
    : 'rgba(99, 102, 241, 0.28)'
  const hoverBg       = isLight ? 'rgba(0,0,0,0.04)'            : 'rgba(255,255,255,0.07)'
  const badgeBg       = isLight ? '#0071e3'                      : 'rgba(255,255,255,0.3)'
  const badgeColor    = '#fff'

  return (
    <LayoutGroup>
      <div
        className={`inline-flex items-center gap-1 p-1.5 rounded-[28px] ${className}`}
        style={{
          background: containerBg,
          border: containerBorder,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          overflow: 'hidden',
          cursor: 'grab',
        }}
      >
        <motion.div
          className="flex items-center gap-1"
          style={{ x: springX }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => {
            setIsDragging(true)
            setLiveSelected(selected)
          }}
          onDrag={(_e, info) => {
            const nearest = getNearestId(info.point.x)
            setLiveSelected(nearest)
          }}
          onDragEnd={(_e, info) => {
            const nearest = getNearestId(info.point.x)
            onSelect(nearest)
            setIsDragging(false)
            x.set(0)
          }}
        >
          {categories.map((cat, i) => {
            const isActive = cat.id === activeId
            const isHovered = cat.id === hovered

            return (
              <button
                key={cat.id}
                ref={(el) => { buttonRefs.current[i] = el }}
                onClick={() => {
                  if (!isDragging) onSelect(cat.id)
                }}
                onMouseEnter={() => setHovered(cat.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ position: 'relative', padding: '6px 16px', borderRadius: 22, border: 'none', background: 'none', cursor: 'pointer' }}
              >
                {/* Active glass indicator — slides via layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="liquid-cat-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: 22 }}
                  >
                    <LiquidGlassBase
                      borderRadius={22}
                      blur={18}
                      tint={activeTint}
                      withDistortion={false}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                  </motion.div>
                )}

                {/* Hover glow (non-active only) */}
                {!isActive && isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 22,
                      background: hoverBg,
                    }}
                  />
                )}

                {/* Label + badge */}
                <motion.span
                  animate={{
                    color: isActive ? activeColor : inactiveColor,
                    fontWeight: isActive ? 600 : 400,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'relative',
                    zIndex: 4,
                    fontSize: 13,
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.label}
                  {cat.badge != null && cat.badge > 0 && (
                    <span style={{
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: isActive ? (isLight ? 'rgba(224,117,53,0.7)' : 'rgba(255,255,255,0.4)') : badgeBg,
                      color: badgeColor,
                      fontSize: 10, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px',
                    }}>
                      {cat.badge > 9 ? '9+' : cat.badge}
                    </span>
                  )}
                </motion.span>
              </button>
            )
          })}
        </motion.div>
      </div>
    </LayoutGroup>
  )
}
