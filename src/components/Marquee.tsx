/**
 * Marquee
 *
 * Infinite horizontal scroll component. Content is duplicated once to create
 * a seamless CSS animation loop (translateX 0 → -50%).
 */

import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode[]
  /** Duration of one full cycle in seconds (default 32) */
  duration?: number
  /** Gap between items in px (default 20) */
  gap?: number
  /** Pause on hover (default true) */
  pauseOnHover?: boolean
  /** Reverse direction */
  reverse?: boolean
  /** Optional className on outer wrapper */
  className?: string
}

export default function Marquee({
  children,
  duration = 32,
  gap = 20,
  pauseOnHover = true,
  reverse = false,
  className = '',
}: MarqueeProps) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }}
    >
      <div
        className="flex"
        style={{
          width: 'max-content',
          gap,
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
        onMouseEnter={(e) => {
          if (pauseOnHover)
            (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'
        }}
        onMouseLeave={(e) => {
          if (pauseOnHover)
            (e.currentTarget as HTMLElement).style.animationPlayState = 'running'
        }}
      >
        {/* Original set */}
        {children.map((child, i) => (
          <div key={`a-${i}`} style={{ flexShrink: 0 }}>
            {child}
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {children.map((child, i) => (
          <div key={`b-${i}`} style={{ flexShrink: 0 }} aria-hidden>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
