/**
 * LiquidGlassBase
 *
 * 4-layer glass component architecture (from Apple Liquid Glass UI CSS/HTML):
 *
 *  Layer 1 — glass-filter : backdrop-filter blur + SVG turbulence distortion
 *  Layer 2 — glass-overlay: semi-transparent tint
 *  Layer 3 — glass-specular: inset highlight (top-left rim light)
 *  Layer 4 — glass-content : undistorted children content
 *
 * The key insight: filter is applied to the EMPTY backdrop layer so content
 * remains crisp while the blurred backdrop appears liquid/distorted.
 */

import type { LiquidGlassBaseProps } from '../../types'

export default function LiquidGlassBase({
  children,
  className = '',
  borderRadius = 20,
  blur = 22,
  tint = 'rgba(255, 255, 255, 0.18)',
  withDistortion = true,
  style,
}: LiquidGlassBaseProps) {
  const br =
    typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: br,
        boxShadow:
          '0 6px 20px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.1)',
        ...style,
      }}
    >
      {/* ── Layer 1: Distorted backdrop ─────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          backdropFilter: `blur(${blur}px) saturate(1.8) brightness(1.05)`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(1.8) brightness(1.05)`,
          // SVG turbulence distorts the blurred backdrop — children stay crisp
          filter: withDistortion ? 'url(#lg-turbulence)' : undefined,
          zIndex: 0,
        }}
      />

      {/* ── Layer 2: Tint ───────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: tint,
          zIndex: 1,
        }}
      />

      {/* ── Layer 3: Specular rim highlight ─────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow:
            'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25)',
          zIndex: 2,
        }}
      />

      {/* ── Layer 4: Content (always crisp, above all glass layers) ─────────── */}
      <div style={{ position: 'relative', zIndex: 3 }}>{children}</div>
    </div>
  )
}
