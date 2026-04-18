/**
 * LiquidSlider
 *
 * iOS brightness-slider style. Pointer drag with spring-physics thumb snap.
 * The filled portion uses an indigo gradient; track uses LiquidGlassBase.
 */

import { useRef, useState, useCallback } from 'react'
import { motion, useSpring } from 'framer-motion'
import LiquidGlassBase from './LiquidGlassBase'
import type { LiquidSliderProps } from '../../types'

const TRACK_H = 36
const THUMB_SIZE = 30

export default function LiquidSlider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
}: LiquidSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Normalised 0→1
  const pct = (value - min) / (max - min)

  // Spring for smooth thumb position feedback
  const thumbX = useSpring(pct, {
    stiffness: 380,
    damping: 28,
    mass: 0.5,
  })

  const computeValue = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return value
      const rect = trackRef.current.getBoundingClientRect()
      const raw = (clientX - rect.left) / rect.width
      const clamped = Math.max(0, Math.min(1, raw))
      return Math.round(min + clamped * (max - min))
    },
    [value, min, max],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const v = computeValue(e.clientX)
    onChange(v)
    thumbX.set((v - min) / (max - min))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const v = computeValue(e.clientX)
    onChange(v)
    thumbX.set((v - min) / (max - min))
  }

  const onPointerUp = () => setIsDragging(false)

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <div className="flex justify-between">
          <span className="text-xs font-medium text-white/50 tracking-wide uppercase">
            {label}
          </span>
          <span className="text-xs font-semibold text-white/70">{value}</span>
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: 'relative',
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* Glass track */}
        <LiquidGlassBase
          borderRadius={TRACK_H / 2}
          blur={14}
          tint="rgba(255, 255, 255, 0.08)"
          withDistortion={false}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Filled portion */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            borderRadius: TRACK_H / 2,
            background:
              'linear-gradient(90deg, rgba(99,102,241,0.7), rgba(139,92,246,0.6))',
            width: thumbX.get() * 100 + '%', // initial
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {/* Animate fill width via motion style */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background:
                'linear-gradient(90deg, rgba(99,102,241,0.9), rgba(139,92,246,0.7))',
              scaleX: thumbX,
              transformOrigin: 'left center',
            }}
          />
        </motion.div>

        {/* Thumb */}
        <motion.div
          style={{
            position: 'absolute',
            top: (TRACK_H - THUMB_SIZE) / 2,
            left: 0,
            x: `calc(${pct * 100}% - ${THUMB_SIZE / 2}px)`,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            zIndex: 10,
            borderRadius: '50%',
            boxShadow:
              '0 2px 10px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.3)',
            scale: isDragging ? 1.08 : 1,
          }}
          transition={{ scale: { type: 'spring', stiffness: 400, damping: 20 } }}
        >
          <LiquidGlassBase
            borderRadius="50%"
            blur={10}
            tint="rgba(255, 255, 255, 0.88)"
            withDistortion={false}
            style={{ position: 'absolute', inset: 0 }}
          />
        </motion.div>
      </div>
    </div>
  )
}
