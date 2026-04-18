/**
 * CardCarousel — Apple-style bento card carousel
 *
 * Architecture:
 *  ┌─ CardCarousel (parent) ──────────────────────────────────────────────┐
 *  │  Owns: active, isPlaying, isFinished, animKey                        │
 *  │  Timer: useEffect + setTimeout — SOLE source of truth for timing.    │
 *  │  animKey increments whenever the progress bar must restart from 0:   │
 *  │    • active changes (card changed)                                   │
 *  │    • user resumes after pause                                        │
 *  │    • replay                                                          │
 *  └──────────────────────────────────────────────────────────────────────┘
 *  ┌─ ProgressDot (child, purely visual) ────────────────────────────────┐
 *  │  Receives: isActive, isPlaying, animKey, duration                   │
 *  │  Effect A — restarts animation: deps [isActive, animKey]            │
 *  │  Effect B — play/pause only:    deps [isActive, isPlaying]          │
 *  │  No onComplete callback — parent's setTimeout drives timing.        │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * Bugs fixed:
 *  Bug 3: clicking last dot no longer immediately triggers "다시보기"
 *         because timing is driven by setTimeout, not onComplete callback.
 *  Bug 4: replay is guaranteed to restart because setActive(0), setIsPlaying(true),
 *         and setAnimKey(k+1) all flush together in one batch.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useAnimate } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOPLAY_DURATION = 5   // seconds per card
const GAP = 8                  // px between slide items

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarouselCard {
  id: string
  tag: string
  title: string
  description: string
  gradient: string
  accentColor: string
  icon: string
  stat?: { value: string; label: string }
}

// ─── Default data ─────────────────────────────────────────────────────────────

export const DEFAULT_CAROUSEL_CARDS: CarouselCard[] = [
  {
    id: 'reserve',
    tag: '실시간 예약',
    title: '스터디룸을\n지금 바로.',
    description: '빈 자리를 즉시 확인하고, 원하는 시간에 딱 맞는 공간을 예약하세요. 기다림 없이 시작하는 집중.',
    gradient: 'from-indigo-400 to-violet-500',
    accentColor: 'rgba(99,102,241,0.28)',
    icon: '🗓️',
    stat: { value: '2분', label: '평균 예약 시간' },
  },
  {
    id: 'group',
    tag: '스터디 그룹',
    title: '같이 달리면\n더 빠릅니다.',
    description: '목표가 같은 사람들과 팀을 만드세요. 서로의 진도를 확인하고 함께 성장하는 경험을 드립니다.',
    gradient: 'from-sky-400 to-cyan-400',
    accentColor: 'rgba(56,189,248,0.24)',
    icon: '👥',
    stat: { value: '3.2×', label: '팀 학습 효율' },
  },
  {
    id: 'community',
    tag: '커뮤니티',
    title: '질문이\n답이 됩니다.',
    description: '모르는 것을 물어보고, 아는 것을 나누세요. 활발한 지식 순환이 모두를 더 빠르게 성장시킵니다.',
    gradient: 'from-violet-400 to-pink-400',
    accentColor: 'rgba(167,139,250,0.24)',
    icon: '💬',
    stat: { value: '1,200+', label: '누적 답변' },
  },
  {
    id: 'stats',
    tag: '학습 통계',
    title: '데이터로 보는\n나의 성장.',
    description: '일별·주별 학습 시간, 집중도, 스터디 참여율을 한눈에 확인하세요. 숫자가 동기부여가 됩니다.',
    gradient: 'from-emerald-400 to-teal-400',
    accentColor: 'rgba(52,211,153,0.24)',
    icon: '📊',
    stat: { value: '87%', label: '목표 달성률' },
  },
  {
    id: 'ranking',
    tag: '리더보드',
    title: '선의의 경쟁이\n실력을 키웁니다.',
    description: '주간 학습 시간 TOP 10에 도전해보세요. 경쟁이 아닌 함께하는 레이스, 모두가 이깁니다.',
    gradient: 'from-amber-400 to-orange-400',
    accentColor: 'rgba(251,191,36,0.24)',
    icon: '🏆',
    stat: { value: '주간', label: '리셋되는 랭킹' },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractRGB(rgba: string): string {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? `${m[1]}, ${m[2]}, ${m[3]}` : '99, 102, 241'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={11} height={11} fill="currentColor">
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={11} height={11} fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  )
}

// ─── ProgressDot ──────────────────────────────────────────────────────────────
/**
 * Purely visual — no timing logic, no callbacks.
 *
 * Effect A: deps [isActive, animKey]
 *   • isActive=false → cancel + reset bar to 0
 *   • isActive=true  → cancel old, reset to 0, start fresh animation
 *                      immediately pause if !isPlaying
 *
 * Effect B: deps [isActive, isPlaying]
 *   • play() or pause() on existing controls (no restart)
 */
function ProgressDot({
  isActive,
  isPlaying,
  animKey,
  duration,
  onClick,
  label,
}: {
  isActive: boolean
  isPlaying: boolean
  animKey: number
  duration: number
  onClick: () => void
  label: string
}) {
  const [fillRef, animateFill] = useAnimate<HTMLDivElement>()
  const controlsRef = useRef<ReturnType<typeof animateFill> | null>(null)

  // ── Effect A: start / restart animation ──────────────────────────────────
  useEffect(() => {
    const el = fillRef.current
    if (!el) return

    // Cancel whatever was running
    controlsRef.current?.cancel()
    controlsRef.current = null

    if (!isActive) {
      // Reset to 0 instantly and stop
      animateFill(el, { scaleX: 0 }, { duration: 0 })
      return
    }

    // isActive = true: reset to 0 then start fill animation
    animateFill(el, { scaleX: 0 }, { duration: 0 })
    const controls = animateFill(el, { scaleX: 1 }, { duration, ease: 'linear' })
    controlsRef.current = controls

    // If currently paused, freeze immediately after starting
    if (!isPlaying) {
      controls.pause()
    }

    return () => {
      controls.cancel()
      controlsRef.current = null
    }
  }, [isActive, animKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect B: play / pause (no restart) ──────────────────────────────────
  useEffect(() => {
    if (!isActive || !controlsRef.current) return
    if (isPlaying) {
      controlsRef.current.play()
    } else {
      controlsRef.current.pause()
    }
  }, [isActive, isPlaying])

  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      animate={{ width: isActive ? 48 : 10 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        height: 10,
        borderRadius: 999,
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)',
      }}
    >
      {isActive && (
        <div
          ref={fillRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.95)',
            transformOrigin: 'left center',
            transform: 'scaleX(0)',
          }}
        />
      )}
    </motion.button>
  )
}

// ─── PillIndicator ────────────────────────────────────────────────────────────

function PillIndicator({
  count,
  active,
  isPlaying,
  isFinished,
  animKey,
  onSelect,
  onPause,
  onPlay,
  onReplay,
}: {
  count: number
  active: number
  isPlaying: boolean
  isFinished: boolean
  animKey: number
  onSelect: (i: number) => void
  onPause: () => void
  onPlay: () => void
  onReplay: () => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 6px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Dots */}
      {Array.from({ length: count }).map((_, i) => (
        <ProgressDot
          key={i}
          isActive={i === active}
          isPlaying={isPlaying}
          animKey={animKey}
          duration={AUTOPLAY_DURATION}
          onClick={() => onSelect(i)}
          label={`${i + 1}번 카드`}
        />
      ))}

      {/* Divider */}
      <div
        style={{
          width: 1, height: 14, flexShrink: 0,
          background: 'rgba(255,255,255,0.14)',
          marginLeft: 2, marginRight: 2,
        }}
      />

      {/*
       * 3-state control button (requirement 2):
       *   playing   → Pause button
       *   paused    → Play button
       *   finished  → Replay button
       */}
      {isFinished ? (
        <motion.button
          key="replay"
          onClick={onReplay}
          whileTap={{ scale: 0.85 }}
          aria-label="처음부터 재생"
          style={controlBtnStyle}
        >
          <ReplayIcon />
        </motion.button>
      ) : isPlaying ? (
        <motion.button
          key="pause"
          onClick={onPause}
          whileTap={{ scale: 0.85 }}
          aria-label="일시정지"
          style={controlBtnStyle}
        >
          <PauseIcon />
        </motion.button>
      ) : (
        <motion.button
          key="play"
          onClick={onPlay}
          whileTap={{ scale: 0.85 }}
          aria-label="재생"
          style={controlBtnStyle}
        >
          <PlayIcon />
        </motion.button>
      )}
    </div>
  )
}

const controlBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 999,
  border: 'none',
  background: 'rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  flexShrink: 0,
}

// ─── AppleBentoCard ───────────────────────────────────────────────────────────

function AppleBentoCard({ card }: { card: CarouselCard }) {
  const rgb = extractRGB(card.accentColor)
  const lines = card.title.split('\n')

  return (
    <div
      style={{
        width: '100%', height: '100%',
        borderRadius: 28, overflow: 'hidden',
        position: 'relative', background: '#06060e',
      }}
    >
      <div aria-hidden style={{
        position: 'absolute', top: '-8%', right: '-4%',
        width: '50%', aspectRatio: '1',
        background: `radial-gradient(circle, rgba(${rgb},0.22) 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '45%',
        background: `radial-gradient(ellipse at 50% 100%, rgba(${rgb},0.08) 0%, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: 'clamp(28px, 4vw, 52px)',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: `rgba(${rgb},0.88)`,
        }}>
          {card.tag}
        </span>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: 'clamp(64px, 8vw, 96px)', lineHeight: 1,
            filter: `drop-shadow(0 0 40px rgba(${rgb},0.38))`,
            userSelect: 'none',
          }}>
            {card.icon}
          </span>
        </div>

        <div>
          <h3 style={{
            fontSize: 'clamp(28px, 3.8vw, 52px)', fontWeight: 600,
            letterSpacing: '-0.04em', color: '#fff',
            lineHeight: 1.1, marginBottom: 14,
          }}>
            {lines.map((line, i) =>
              i === lines.length - 1 ? (
                <span key={i} className={`bg-linear-to-r ${card.gradient} bg-clip-text text-transparent block`}>
                  {line}
                </span>
              ) : (
                <span key={i} className="block">{line}</span>
              )
            )}
          </h3>

          <p style={{
            fontSize: 14, fontWeight: 300, lineHeight: 1.65,
            color: 'rgba(255,255,255,0.38)', maxWidth: 540,
            marginBottom: card.stat ? 20 : 0,
          }}>
            {card.description}
          </p>

          {card.stat && (
            <div style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 8,
              padding: '8px 18px', borderRadius: 999,
              background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.3)`,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                {card.stat.value}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)' }}>
                {card.stat.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CardCarousel ─────────────────────────────────────────────────────────────

export default function CardCarousel({
  cards = DEFAULT_CAROUSEL_CARDS,
}: {
  cards?: CarouselCard[]
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)   // viewport visibility target
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const [active, setActive] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  /**
   * userPausedRef — true when the user explicitly clicked Pause.
   * Visibility changes should NOT override this preference:
   *   • Section leaves viewport  → pause (don't touch ref)
   *   • Section enters viewport  → resume ONLY IF !userPausedRef.current
   * Cleared by: Play button click, Replay button click.
   */
  const userPausedRef = useRef(false)

  // Ref-shadow of isFinished — readable inside callbacks without stale closure.
  const isFinishedRef = useRef(false)
  useEffect(() => { isFinishedRef.current = isFinished }, [isFinished])

  // Guard: suppress pause-on-track-scroll during programmatic scrolls
  const isProgrammaticScroll = useRef(false)

  // ── scrollToCard ──────────────────────────────────────────────────────────
  const scrollToCard = useCallback((index: number) => {
    if (!trackRef.current || !cardRefs.current[0]) return
    isProgrammaticScroll.current = true
    const slideWidth = cardRefs.current[0].offsetWidth
    trackRef.current.scrollTo({ left: index * (slideWidth + GAP), behavior: 'smooth' })
    setTimeout(() => { isProgrammaticScroll.current = false }, 900)
  }, [])

  // ── Section visibility → auto-pause / auto-resume ─────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Section entered viewport: resume only if user didn't manually pause
          // and the playlist isn't finished.
          if (!userPausedRef.current && !isFinishedRef.current) {
            setAnimKey(k => k + 1)   // restart bar from 0 (keeps timer in sync)
            setIsPlaying(true)
          }
        } else {
          // Section left viewport: silently pause (don't mark as user-paused)
          setIsPlaying(false)
        }
      },
      { threshold: 0.15 }   // trigger when 15 % of the section is visible
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Active card tracking (card-level IO inside the scroll track) ──────────
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActive(prev => {
              if (prev === i) return prev
              setAnimKey(k => k + 1)
              return i
            })
          }
        },
        { root: trackRef.current, threshold: 0.5 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [cards.length])

  // ── Pause on user track-scroll ────────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      if (!isProgrammaticScroll.current) {
        userPausedRef.current = true   // treat manual swipe as explicit pause
        setIsPlaying(false)
      }
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  // ── Auto-play timer (sole timing source) ──────────────────────────────────
  useEffect(() => {
    if (!isPlaying || isFinished) return

    const timer = setTimeout(() => {
      const next = active + 1
      if (next < cards.length) {
        setActive(next)
        setAnimKey(k => k + 1)
        scrollToCard(next)
      } else {
        setIsFinished(true)
        setIsPlaying(false)
      }
    }, AUTOPLAY_DURATION * 1000)

    return () => clearTimeout(timer)
  }, [active, isPlaying, isFinished, cards.length, scrollToCard])

  // ── Controls ──────────────────────────────────────────────────────────────

  const handleDotSelect = useCallback((index: number) => {
    scrollToCard(index)
  }, [scrollToCard])

  const handlePause = useCallback(() => {
    userPausedRef.current = true    // remember: user explicitly paused
    setIsPlaying(false)
  }, [])

  const handlePlay = useCallback(() => {
    userPausedRef.current = false   // user explicitly resumed → clear pause flag
    setAnimKey(k => k + 1)
    setIsPlaying(true)
  }, [])

  const handleReplay = useCallback(() => {
    userPausedRef.current = false   // replay always clears the pause flag
    setIsFinished(false)
    setIsPlaying(true)
    setActive(0)
    setAnimKey(k => k + 1)
    scrollToCard(0)
  }, [scrollToCard])

  return (
    <div ref={wrapperRef}>
      {/* ── Card track ───────────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          height: 'min(calc(100vh - 220px), 660px)',
          minHeight: 460,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          paddingLeft: 48,
          paddingRight: 48,
          gap: GAP,
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        } as React.CSSProperties}
      >
        {cards.map((card, i) => (
          <div
            key={card.id}
            ref={el => { cardRefs.current[i] = el }}
            style={{ flexShrink: 0, width: 'calc(100vw - 96px)', scrollSnapAlign: 'center' }}
          >
            <AppleBentoCard card={card} />
          </div>
        ))}
      </div>

      {/*
       * ── Sticky indicator ─────────────────────────────────────────────────
       * position: sticky + bottom: 40px:
       *   • Enters with section from below
       *   • Locks 40px above viewport bottom while section is visible
       *   • Released at section's bottom boundary — scrolls away with section
       *
       * marginTop: -64px  → visually overlaps the card track's bottom edge
       * height: 64px      → reserves block space in the document flow
       */}
      <div
        style={{
          position: 'sticky',
          bottom: 52,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <PillIndicator
            count={cards.length}
            active={active}
            isPlaying={isPlaying}
            isFinished={isFinished}
            animKey={animKey}
            onSelect={handleDotSelect}
            onPause={handlePause}
            onPlay={handlePlay}
            onReplay={handleReplay}
          />
        </div>
      </div>
    </div>
  )
}
