/**
 * LiquidShaderBase
 *
 * Full-fidelity port of liquid-glass.js (Shu Ding, 2025) into a React component.
 *
 * Architecture — identical to liquid-glass.js:
 *   1. Canvas displacement map  — SDF fragment shader computed per pixel
 *   2. Proxy mouse tracking     — Proxy detects if fragment reads mouse → re-renders
 *   3. Dynamic maxScale         — scale computed from actual displacement range
 *   4. SVG feImage + feDisplacementMap — canvas data URL → SVG filter
 *   5. Turbulence layer         — organic noise (LiquidSvgFilters scale-70 heritage)
 *   6. backdropFilter chain     — url(#id) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)
 *                                  (verbatim from liquid-glass.js)
 *
 * Fragment shader — convex glass lens for pill shape:
 *   - Capsule SDF (horizontal stadium) computed in physical pixel space
 *   - Depth = max(0, -sdf_normalized) → 0 at surface, 1 at interior center
 *   - zoom = 0.10 * depth  → convex magnification (center appears larger)
 *   - Mouse parallax via Proxy pattern → triggers re-render on cursor move
 */

import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react'

// ── Per-instance stable ID (no useId requirement) ────────────────────────────
let _idCounter = 0
function usePersistentId(): string {
  const ref = useRef('')
  if (!ref.current) ref.current = `lgs-${++_idCounter}`
  return ref.current
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions — verbatim from liquid-glass.js
// ─────────────────────────────────────────────────────────────────────────────

function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function vecLen(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragment shader factory
//
// Returns a fragment function (uv, mouse) → { x, y }
// Implements a convex pill-shaped glass lens:
//   • Capsule SDF gives "depth" into the glass
//   • Center pixels are magnified (zoom-in = convex lens)
//   • Mouse parallax tilts the refraction cone with the cursor
//   • Reading mouse.x / mouse.y flags the Proxy as "used"
//     → identical pattern to liquid-glass.js
// ─────────────────────────────────────────────────────────────────────────────
function createPillFragment(W: number, H: number) {
  const r = H / 2           // capsule radius = half height
  const a = W / 2 - r       // half-length of straight segment

  return function fragment(
    uv: { x: number; y: number },
    mouse: { x: number; y: number },
  ): { x: number; y: number } {
    const ix = uv.x - 0.5   // centered UV  [-0.5,  0.5]
    const iy = uv.y - 0.5

    // Physical pixel coordinates (centered at origin)
    const px = ix * W
    const py = iy * H

    // Horizontal capsule (stadium) SDF — exact distance from pill surface
    // negative = inside glass, 0 = surface, positive = outside
    const sdfPx = vecLen(Math.max(Math.abs(px) - a, 0), py) - r
    const sdf   = sdfPx / r   // normalised by radius

    // Depth into glass: 1 at geometric center row, 0 at surface
    const depth = Math.max(0, -sdf)

    // ── Convex lens zoom-in ──────────────────────────────────────────────
    // For zoom-in: sample from ix*(1-zoom) which is closer to center
    // → background pixels appear larger (magnified) at depth
    const zoom = 0.10 * smoothStep(0, 1, depth)

    // ── Mouse parallax — Proxy pattern from liquid-glass.js ─────────────
    // Accessing mouse.x / mouse.y marks proxy as "used"
    // → parent re-renders canvas on every mousemove
    const mx = (mouse.x - 0.5) * 0.08 * depth
    const my = (mouse.y - 0.5) * 0.08 * depth

    return {
      x: ix * (1 - zoom) - mx + 0.5,
      y: iy * (1 - zoom) - my + 0.5,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface LiquidShaderBaseProps {
  children?: ReactNode
  /** Element pixel width — used for canvas and SVG filter dimensions */
  width: number
  /** Element pixel height — used for canvas and SVG filter dimensions */
  height: number
  borderRadius?: number | string
  tint?: string
  style?: CSSProperties
  className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LiquidShaderBase({
  children,
  width,
  height,
  borderRadius = 0,
  tint = 'rgba(255,255,255,0.18)',
  style,
  className = '',
}: LiquidShaderBaseProps) {
  const id       = usePersistentId()
  const filterId = `${id}-f`

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const feImageRef   = useRef<SVGFEImageElement>(null)
  const feDispRef    = useRef<SVGFEDisplacementMapElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number>(0)

  const br = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

  // Turbulence secondary scale: proportional to element height,
  // analogous to scale=70 on a ~320px element (≈ 22%)
  const turbScale = Math.max(4, Math.round(height * 0.22))

  useEffect(() => {
    const canvas  = canvasRef.current
    const feImage = feImageRef.current
    const feDisp  = feDispRef.current
    if (!canvas || !feImage || !feDisp) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw       = canvas.width
    const ch       = canvas.height
    const fragment = createPillFragment(width, height)

    // ── updateShader — verbatim logic from liquid-glass.js ───────────────
    function updateShader(mouseX: number, mouseY: number): boolean {
      const mouseObj = { x: mouseX, y: mouseY }
      let mouseUsed  = false

      // Proxy: flag mouseUsed when fragment reads any mouse property
      const mouseProxy = new Proxy(mouseObj, {
        get(target, prop: string) {
          mouseUsed = true
          return target[prop as keyof typeof target]
        },
      })

      mouseUsed = false  // reset before fragment loop

      const pixelCount  = cw * ch
      const data        = new Uint8ClampedArray(pixelCount * 4)
      const rawValues   = new Float32Array(pixelCount * 2)
      let maxScale      = 0
      let rawIdx        = 0

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % cw
        const y = Math.floor(i / 4 / cw)

        const pos = fragment({ x: x / cw, y: y / ch }, mouseProxy)

        const dx = pos.x * cw - x
        const dy = pos.y * ch - y

        if (Math.abs(dx) > maxScale) maxScale = Math.abs(dx)
        if (Math.abs(dy) > maxScale) maxScale = Math.abs(dy)

        rawValues[rawIdx++] = dx
        rawValues[rawIdx++] = dy
      }

      // Halve maxScale as in liquid-glass.js (gives headroom at both ends)
      maxScale *= 0.5
      if (maxScale < 1) maxScale = 1

      let idx = 0
      for (let i = 0; i < data.length; i += 4) {
        const rVal = rawValues[idx++] / maxScale + 0.5
        const gVal = rawValues[idx++] / maxScale + 0.5
        data[i]     = rVal * 255
        data[i + 1] = gVal * 255
        data[i + 2] = 0
        data[i + 3] = 255
      }

      ctx!.putImageData(new ImageData(data, cw, ch), 0, 0)

      // Push canvas data URL → SVG feImage (liquid-glass.js pattern)
      feImage!.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href',
        canvas!.toDataURL(),
      )
      feDisp!.setAttribute('scale', String(maxScale))

      return mouseUsed
    }

    // Initial render — also determines if mouse tracking is required
    let needsMouse = updateShader(0.5, 0.5)
    // Second call confirms Proxy detection with stable value
    needsMouse = updateShader(0.5, 0.5)

    // ── Mouse tracking — Proxy-gated, RAF-throttled ───────────────────────
    const handleMouseMove = (e: MouseEvent): void => {
      if (!needsMouse) return  // fragment doesn't use mouse → skip

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mx   = (e.clientX - rect.left) / rect.width
      const my   = (e.clientY - rect.top)  / rect.height

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        needsMouse     = updateShader(mx, my)
        rafRef.current = 0
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [width, height])

  return (
    <>
      {/*
       * SVG filter — must precede the glass container in DOM
       * so the CSS url(#filterId) reference resolves immediately.
       *
       * Two-stage displacement pipeline:
       *   Stage 1: Canvas SDF lens (liquid-glass.js)
       *   Stage 2: Turbulence organic noise (LiquidSvgFilters heritage, scaled)
       */}
      <svg
        aria-hidden
        xmlns="http://www.w3.org/2000/svg"
        width={0}
        height={0}
        style={{
          position: 'absolute',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width={String(width)}
            height={String(height)}
          >
            {/* Stage 1 — Canvas SDF lens (liquid-glass.js) ─────────────── */}
            <feImage
              ref={feImageRef}
              result="lensMap"
              width={String(width)}
              height={String(height)}
            />
            <feDisplacementMap
              ref={feDispRef}
              in="SourceGraphic"
              in2="lensMap"
              xChannelSelector="R"
              yChannelSelector="G"
              result="lensed"
            />

            {/* Stage 2 — Turbulence organic noise ─────────────────────── */}
            {/* baseFrequency tuned for pill height (≈0.065 → ~3 cycles/46px) */}
            {/* scale proportional to height, analogous to scale=70 on 320px  */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.065 0.065"
              numOctaves={2}
              seed={92}
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation={0.8} result="softNoise" />
            <feDisplacementMap
              in="lensed"
              in2="softNoise"
              scale={turbScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Hidden canvas — displacement map data source */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-hidden
        style={{ display: 'none' }}
      />

      {/*
       * Glass container — 4-layer architecture (same as LiquidGlassBase)
       *
       * Layer 1: Canvas-lens + turbulence backdrop
       *   backdropFilter chain — verbatim from liquid-glass.js:
       *   url(#filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)
       * Layer 2: Tint
       * Layer 3: Specular rim (inset highlight)
       * Layer 4: Content (always crisp)
       */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{
          borderRadius: br,
          boxShadow:
            '0 6px 20px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.1)',
          ...style,
        }}
      >
        {/* Layer 1 — Lens-distorted + turbulence backdrop ─────────────── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            backdropFilter: `url(#${filterId}) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`,
            WebkitBackdropFilter: `url(#${filterId}) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Layer 2 — Tint ─────────────────────────────────────────────── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: tint,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Layer 3 — Specular rim highlight ───────────────────────────── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            boxShadow:
              'inset 1px 1px 0 rgba(255,255,255,0.65), inset 0 0 6px rgba(255,255,255,0.25)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Layer 4 — Content (always crisp, above all glass layers) ──── */}
        <div style={{ position: 'relative', zIndex: 3 }}>{children}</div>
      </div>
    </>
  )
}
