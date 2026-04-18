/**
 * useLiquidShader
 *
 * Ports the Canvas-based displacement map rendering from liquid-glass.js
 * into a React hook. The original Vanilla JS logic (pixel-by-pixel fragment
 * computation, Canvas → feImage → feDisplacementMap pipeline) is preserved
 * verbatim inside useEffect, keeping it isolated from React's render cycle.
 *
 * Usage:
 *   const { filterId, shellRef } = useLiquidShader({ width: 300, height: 200 })
 *   // Then apply: style={{ backdropFilter: `url(#${filterId}) blur(...)` }}
 *   // on any <div ref={shellRef} />
 */

import { useEffect, useRef, useId } from 'react'
import type { UV, FragmentFn, ShaderOptions } from '../types'

// ─── Math Utilities (ported verbatim from liquid-glass.js) ───────────────────

function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function len2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}

/** Rounded-rectangle signed distance function */
export function roundedRectSDF(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): number {
  const qx = Math.abs(x) - width + radius
  const qy = Math.abs(y) - height + radius
  return (
    Math.min(Math.max(qx, qy), 0) +
    len2(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  )
}

/** Default lens-like fragment (rounded-rect displacement) — radius 0.6 per original */
export const defaultFragment: FragmentFn = (uv: UV): UV => {
  const ix = uv.x - 0.5
  const iy = uv.y - 0.5
  const d = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6)
  const disp = smoothStep(0.8, 0, d - 0.15)
  const scaled = smoothStep(0, 1, disp)
  return { x: ix * scaled + 0.5, y: iy * scaled + 0.5 }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLiquidShaderReturn {
  /** ID of the generated SVG filter — use in `backdrop-filter: url(#filterId)` */
  filterId: string
  /** Attach to the element that should receive the backdrop-filter */
  shellRef: React.RefObject<HTMLDivElement | null>
}

export function useLiquidShader({
  width,
  height,
  fragment = defaultFragment,
}: ShaderOptions): UseLiquidShaderReturn {
  const rawId = useId().replace(/:/g, 'x')
  const filterId = `lg-${rawId}`

  const shellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const svgNS = 'http://www.w3.org/2000/svg'
    const xlinkNS = 'http://www.w3.org/1999/xlink'

    // ── Canvas (hidden) ───────────────────────────────────────────────────────
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.display = 'none'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!

    // ── SVG Filter ───────────────────────────────────────────────────────────
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.style.cssText =
      'position:fixed;top:0;left:0;pointer-events:none;z-index:-1;'

    const defs = document.createElementNS(svgNS, 'defs')
    const filter = document.createElementNS(svgNS, 'filter')
    filter.setAttribute('id', filterId)
    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', String(width))
    filter.setAttribute('height', String(height))

    const feImage = document.createElementNS(svgNS, 'feImage')
    feImage.setAttribute('result', 'map')
    feImage.setAttribute('width', String(width))
    feImage.setAttribute('height', String(height))

    const feDispl = document.createElementNS(svgNS, 'feDisplacementMap')
    feDispl.setAttribute('in', 'SourceGraphic')
    feDispl.setAttribute('in2', 'map')
    feDispl.setAttribute('xChannelSelector', 'R')
    feDispl.setAttribute('yChannelSelector', 'G')

    filter.appendChild(feImage)
    filter.appendChild(feDispl)
    defs.appendChild(filter)
    svg.appendChild(defs)
    document.body.appendChild(svg)

    // ── Mouse proxy (tracks whether fragment reads mouse) ─────────────────────
    const mouse: UV = { x: 0.5, y: 0.5 }
    let mouseUsed = false
    const mouseProxy = new Proxy(mouse, {
      get(target, prop) {
        mouseUsed = true
        return target[prop as keyof UV]
      },
    })

    // ── Render displacement map (original pixel loop from liquid-glass.js) ───
    const w = canvas.width
    const h = canvas.height
    const imageData = new ImageData(w, h)
    const data = imageData.data
    const rawValues: number[] = []
    let maxScale = 0

    for (let i = 0; i < data.length; i += 4) {
      const px = (i / 4) % w
      const py = Math.floor(i / 4 / w)
      const pos = fragment({ x: px / w, y: py / h }, mouseProxy)
      const dx = pos.x * w - px
      const dy = pos.y * h - py
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy))
      rawValues.push(dx, dy)
    }

    // Original: maxScale *= 0.5 (no Math.max guard)
    maxScale *= 0.5

    let index = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = rawValues[index++] / maxScale + 0.5
      const g = rawValues[index++] / maxScale + 0.5
      data[i]     = r * 255
      data[i + 1] = g * 255
      data[i + 2] = 0
      data[i + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)

    // Original: setAttributeNS with xlink namespace
    feImage.setAttributeNS(xlinkNS, 'href', canvas.toDataURL())
    feDispl.setAttribute('scale', String(maxScale))

    // Suppress unused variable warning — mouseUsed is a side-effect flag
    void mouseUsed

    // ── Apply backdrop-filter to shell ────────────────────────────────────────
    if (shellRef.current) {
      const bd = `url(#${filterId}) contrast(1.08) brightness(1.15) saturate(1.1)`
      shellRef.current.style.backdropFilter = bd
      ;(shellRef.current.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = bd
    }

    return () => {
      canvas.remove()
      svg.remove()
    }
  }, [width, height, filterId, fragment])

  return { filterId, shellRef }
}
