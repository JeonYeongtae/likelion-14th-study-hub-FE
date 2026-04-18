/**
 * LiquidToggle
 *
 * iOS-style toggle switch with Liquid Glass + framer-motion spring physics.
 * The thumb slides with a spring bounce; the track uses LiquidGlassBase.
 */

import { motion } from 'framer-motion'
import LiquidGlassBase from './LiquidGlassBase'
import type { LiquidToggleProps } from '../../types'

const TRACK_W = 56
const TRACK_H = 32
const THUMB_SIZE = 26
const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - 4 // px

export default function LiquidToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: LiquidToggleProps) {
  return (
    <label
      className="flex items-center gap-3 select-none"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}
    >
      {/* Track */}
      <motion.div
        onClick={() => !disabled && onChange(!checked)}
        animate={{
          backgroundColor: checked
            ? 'rgba(99, 102, 241, 0.6)'
            : 'rgba(255, 255, 255, 0.12)',
        }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'relative',
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        {/* Glass track base */}
        <LiquidGlassBase
          borderRadius={TRACK_H / 2}
          blur={14}
          tint={
            checked
              ? 'rgba(99, 102, 241, 0.35)'
              : 'rgba(255, 255, 255, 0.10)'
          }
          withDistortion={false}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Thumb */}
        <motion.div
          animate={{
            x: checked ? THUMB_TRAVEL : 2,
            scale: checked ? 1 : 0.96,
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 26,
            mass: 0.6,
          }}
          style={{
            position: 'absolute',
            top: (TRACK_H - THUMB_SIZE) / 2,
            left: 0,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: '50%',
            zIndex: 10,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.3)',
          }}
        >
          <LiquidGlassBase
            borderRadius="50%"
            blur={10}
            tint="rgba(255, 255, 255, 0.82)"
            withDistortion={false}
            style={{ position: 'absolute', inset: 0 }}
          />
        </motion.div>
      </motion.div>

      {/* Label */}
      {label && (
        <span className="text-sm font-medium text-white/70">{label}</span>
      )}
    </label>
  )
}
