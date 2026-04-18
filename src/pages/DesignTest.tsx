/**
 * DesignTest — /design-test
 *
 * Showcase of all design components & systems used in StudyHub:
 *  1. LiquidGlassBase — variants (card, panel, pill)
 *  2. LiquidToggle — interactive switches
 *  3. LiquidSlider — draggable slider
 *  4. CategorySelector — animated tab strip
 *  5. Marquee — badge marquee
 *  6. CardCarousel — full autoplay carousel
 *  7. Typography scale
 *  8. Color / gradient swatches
 *  9. Background transition (same fixed-layer system)
 * 10. Header (global — already rendered by App)
 */

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

import LiquidGlassBase from '../components/liquid-glass/LiquidGlassBase'
import LiquidToggle from '../components/liquid-glass/LiquidToggle'
import LiquidSlider from '../components/liquid-glass/LiquidSlider'
import CategorySelector from '../components/liquid-glass/CategorySelector'
import Marquee from '../components/Marquee'
import CardCarousel from '../components/CardCarousel'

const MARQUEE_BADGES = [
  '🗓 스터디룸 예약', '👥 그룹 모집', '💬 커뮤니티', '📱 모바일 최적화',
  '🔔 실시간 알림', '🏆 랭킹 시스템', '🔐 안전한 로그인', '📊 학습 분석',
  '🤝 멘토링', '🎯 목표 관리',
]

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({
  title,
  description,
  children,
  dark = true,
}: {
  title: string
  description?: string
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <section
      style={{
        padding: '80px 48px',
        borderBottom: dark
          ? '1px solid rgba(255,255,255,0.07)'
          : '1px solid rgba(0,0,0,0.07)',
        backgroundColor: 'transparent',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
            marginBottom: 8,
          }}
        >
          Component
        </p>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: dark ? '#fff' : '#111',
            marginBottom: description ? 10 : 36,
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: 15,
              color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
              marginBottom: 36,
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}

// ── Swatch ──────────────────────────────────────────────────────────────────
function Swatch({
  bg,
  label,
  border,
}: {
  bg: string
  label: string
  border?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          background: bg,
          border: border ?? 'none',
        }}
      />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 80 }}>
        {label}
      </span>
    </div>
  )
}

// ── Category data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: '전체', icon: '✦' },
  { id: 'room', label: '스터디룸', icon: '🏠' },
  { id: 'group', label: '그룹', icon: '👥' },
  { id: 'community', label: '커뮤니티', icon: '💬' },
  { id: 'notice', label: '공지', icon: '📢' },
]

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DesignTest() {
  // Background transition (same fixed-layer system as Home)
  const { scrollY } = useScroll()
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const bgColor = useTransform(
    scrollY,
    [vh * 0.4, vh * 1.8],
    ['#f5f5f7', '#050507'],
  )

  // LiquidToggle states
  const [toggle1, setToggle1] = useState(true)
  const [toggle2, setToggle2] = useState(false)
  const [toggle3, setToggle3] = useState(true)
  const [toggleDisabled] = useState(false)

  // LiquidSlider states
  const [brightness, setBrightness] = useState(72)
  const [volume, setVolume] = useState(45)
  const [opacity, setOpacity] = useState(88)

  // CategorySelector state
  const [category, setCategory] = useState('all')

  return (
    <>
      {/* Fixed background layer */}
      <motion.div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundColor: bgColor,
        }}
      />

      {/* Page top padding (for fixed header) */}
      <div style={{ paddingTop: 48 }}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '96px 48px 80px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'transparent',
          }}
        >
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
                marginBottom: 12,
              }}
            >
              StudyHub Design System
            </p>
            <h1
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: '-0.05em',
                color: '#111',
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              Design
              <span
                className="bg-linear-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent"
                style={{ marginLeft: 12 }}
              >
                Showcase
              </span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.45)', maxWidth: 520, lineHeight: 1.65 }}>
              프로젝트에서 사용되는 모든 UI 컴포넌트와 디자인 시스템을 한 곳에서 확인할 수 있는 페이지입니다.
            </p>
          </div>
        </div>

        {/* ── Typography ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '80px 48px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            backgroundColor: 'transparent',
          }}
        >
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
                marginBottom: 8,
              }}
            >
              Component
            </p>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: '#111',
                marginBottom: 36,
              }}
            >
              Typography Scale
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { size: 56, weight: 800, label: 'Display / Hero — 56px 800', text: 'StudyHub' },
                { size: 40, weight: 700, label: 'Heading 1 — 40px 700', text: '스터디룸 예약' },
                { size: 28, weight: 700, label: 'Heading 2 — 28px 700', text: '오늘의 스터디 그룹' },
                { size: 20, weight: 600, label: 'Heading 3 — 20px 600', text: '커뮤니티 게시판' },
                { size: 15, weight: 400, label: 'Body — 15px 400', text: '멋쟁이사자처럼 14기 스터디허브에 오신 것을 환영합니다.' },
                { size: 13, weight: 400, label: 'Caption — 13px 400', text: '2026년 04월 · 서울 · 건국대학교' },
                { size: 11, weight: 600, label: 'Label — 11px 600 Uppercase', text: 'LIKELION 14TH' },
              ].map(({ size, weight, label, text }) => (
                <div key={size} style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(0,0,0,0.3)',
                      width: 200,
                      flexShrink: 0,
                      fontFamily: 'monospace',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: size,
                      fontWeight: weight,
                      color: '#111',
                      letterSpacing: size === 11 ? '0.1em' : size >= 28 ? '-0.04em' : '-0.01em',
                      textTransform: size === 11 ? 'uppercase' : 'none',
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Marquee ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '80px 0',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            backgroundColor: 'transparent',
          }}
        >
          <div style={{ maxWidth: 960, margin: '0 auto', paddingLeft: 48, marginBottom: 36 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
                marginBottom: 8,
              }}
            >
              Component
            </p>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: '#111' }}>
              Marquee
            </h2>
          </div>
          <Marquee duration={28} gap={12}>
            {MARQUEE_BADGES.map((badge) => (
              <span
                key={badge}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 18px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.09)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#333',
                  whiteSpace: 'nowrap',
                }}
              >
                {badge}
              </span>
            ))}
          </Marquee>
        </div>

        {/* ─────────────────────── DARK SECTION START ──────────────────── */}

        {/* ── LiquidGlassBase ────────────────────────────────────────────── */}
        <Section
          title="LiquidGlassBase"
          description="4-layer glass component: backdrop blur + SVG turbulence distortion + tint + specular rim. The core of all glass UI in this project."
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {/* Default glass card */}
            <LiquidGlassBase
              borderRadius={20}
              blur={22}
              tint="rgba(255,255,255,0.18)"
              withDistortion
              style={{ width: 220, padding: 24 }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Default</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em' }}>
                Liquid Glass
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.5 }}>
                withDistortion: true
                <br />blur: 22px · tint: 0.18
              </p>
            </LiquidGlassBase>

            {/* Dark tinted */}
            <LiquidGlassBase
              borderRadius={20}
              blur={24}
              tint="rgba(10,10,20,0.58)"
              withDistortion={false}
              style={{ width: 220, padding: 24 }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Dark Tint</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em' }}>
                Header Pill
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.5 }}>
                withDistortion: false
                <br />blur: 24px · tint: 0.58
              </p>
            </LiquidGlassBase>

            {/* Indigo accent */}
            <LiquidGlassBase
              borderRadius={20}
              blur={18}
              tint="rgba(99,102,241,0.28)"
              withDistortion={false}
              style={{ width: 220, padding: 24 }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Indigo Accent</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em' }}>
                Category Active
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.5 }}>
                withDistortion: false
                <br />blur: 18px · indigo tint
              </p>
            </LiquidGlassBase>

            {/* Pill shape */}
            <LiquidGlassBase
              borderRadius={50}
              blur={14}
              tint="rgba(255,255,255,0.12)"
              withDistortion={false}
              style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap' }}>
                Pill Shape · r=50
              </p>
            </LiquidGlassBase>
          </div>
        </Section>

        {/* ── LiquidToggle ───────────────────────────────────────────────── */}
        <Section
          title="LiquidToggle"
          description="iOS-style toggle with spring physics thumb. The track uses LiquidGlassBase. Active state glows indigo."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <LiquidToggle checked={toggle1} onChange={setToggle1} label="알림 활성화" />
            <LiquidToggle checked={toggle2} onChange={setToggle2} label="다크 모드" />
            <LiquidToggle checked={toggle3} onChange={setToggle3} label="자동 재생" />
            <LiquidToggle checked={false} onChange={() => {}} label="비활성화 (disabled)" disabled />
          </div>
        </Section>

        {/* ── LiquidSlider ───────────────────────────────────────────────── */}
        <Section
          title="LiquidSlider"
          description="Pointer drag with spring-physics thumb snap. Filled portion uses indigo gradient. Track uses LiquidGlassBase."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 440 }}>
            <LiquidSlider value={brightness} onChange={setBrightness} label="밝기" min={0} max={100} />
            <LiquidSlider value={volume} onChange={setVolume} label="볼륨" min={0} max={100} />
            <LiquidSlider value={opacity} onChange={setOpacity} label="불투명도" min={0} max={100} />
          </div>
        </Section>

        {/* ── CategorySelector ───────────────────────────────────────────── */}
        <Section
          title="CategorySelector"
          description="Animated tab strip with Liquid Glass active indicator. Slides between tabs with spring animation. Supports drag-to-select."
        >
          <CategorySelector
            categories={CATEGORIES}
            selected={category}
            onSelect={setCategory}
          />
          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            선택됨: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{category}</span>
          </p>
        </Section>

        {/* ── Color Swatches ─────────────────────────────────────────────── */}
        <Section
          title="Color & Gradient System"
          description="Brand colors, background transition range, and gradient tokens used across the design system."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Background range */}
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14, letterSpacing: '0.05em' }}>
                BACKGROUND TRANSITION
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Swatch bg="#f5f5f7" label="Light #f5f5f7" border="1px solid rgba(255,255,255,0.15)" />
                <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>→</div>
                <Swatch bg="#0d0d14" label="Mid transition" />
                <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>→</div>
                <Swatch bg="#050507" label="Dark #050507" />
              </div>
            </div>

            {/* Brand gradients */}
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14, letterSpacing: '0.05em' }}>
                BRAND GRADIENTS
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Swatch bg="linear-gradient(135deg, #6366f1, #38bdf8)" label="Indigo → Sky (brand)" />
                <Swatch bg="linear-gradient(135deg, #6366f1, #8b5cf6)" label="Indigo → Violet" />
                <Swatch bg="linear-gradient(135deg, rgba(99,102,241,0.7), rgba(139,92,246,0.6))" label="Slider fill" />
                <Swatch bg="linear-gradient(135deg, rgba(99,102,241,0.4), rgba(56,189,248,0.3))" label="Card glow" />
              </div>
            </div>

            {/* Glass tints */}
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14, letterSpacing: '0.05em' }}>
                GLASS TINTS
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Swatch bg="rgba(255,255,255,0.18)" label="Default glass 0.18" />
                <Swatch bg="rgba(10,10,20,0.58)" label="Dark glass 0.58" />
                <Swatch bg="rgba(99,102,241,0.28)" label="Indigo active" />
                <Swatch bg="rgba(255,255,255,0.12)" label="Action button" />
                <Swatch bg="rgba(18,18,24,0.82)" label="GNB bar 0.82" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── CardCarousel ───────────────────────────────────────────────── */}
        <Section
          title="CardCarousel"
          description="Horizontal scroll-snap carousel with autoplay, progress dots, play/pause/replay controls, and section-scoped sticky indicator. Cards use AppleBentoCard (no LiquidGlass)."
        >
          <div style={{ marginLeft: -48, marginRight: -48 }}>
            <CardCarousel />
          </div>
        </Section>

        {/* ── Header Preview ──────────────────────────────────────────────── */}
        <Section
          title="Header — Apple GNB"
          description="Two states: full-width dark translucent bar (at top) and Liquid Glass pill (scrolled > 80px). The global header above is live — scroll up/down to see the transition."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Full-width preview */}
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                Full-width mode — CSS Grid 1fr auto 1fr · height 48px · rgba(18,18,24,0.82) + blur(20px)
              </p>
              <div
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    height: 48,
                    paddingLeft: 48,
                    paddingRight: 48,
                    background: 'rgba(18,18,24,0.82)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.04em' }}>
                    Study<span className="bg-linear-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Hub</span>
                  </span>
                  <nav style={{ display: 'flex', gap: 28 }}>
                    {['스터디룸', '커뮤니티', '스터디 그룹', '공지사항'].map((l) => (
                      <span key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{l}</span>
                    ))}
                  </nav>
                  <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>로그인</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, padding: '6px 16px' }}>시작하기</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pill preview */}
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                Pill mode — LiquidGlassBase · width 310px · borderRadius 50 · [Logo] [Page Title] [User Icon]
              </p>
              <LiquidGlassBase
                borderRadius={50}
                blur={24}
                tint="rgba(10,10,20,0.58)"
                withDistortion={false}
                style={{ width: 310 }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, paddingLeft: 22, paddingRight: 22, gap: 20 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', flexShrink: 0 }}>
                    Study<span className="bg-linear-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Hub</span>
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', flex: 1, textAlign: 'center' }}>홈</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-3.87 3.58-7 8-7s8 3.13 8 7" />
                    </svg>
                  </div>
                </div>
              </LiquidGlassBase>
            </div>
          </div>
        </Section>

        {/* ── Spacing & Layout tokens ─────────────────────────────────────── */}
        <Section
          title="Spacing & Layout Tokens"
          description="Key spacing values and layout rules used across the design system."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { token: 'Header height', value: '48px' },
              { token: 'Page horizontal padding', value: '48px' },
              { token: 'Section vertical padding', value: '80px' },
              { token: 'Card gap (carousel)', value: '8px' },
              { token: 'Card border radius', value: '24px' },
              { token: 'Nav item gap (GNB)', value: '28px' },
              { token: 'Pill width (scrolled)', value: '310px' },
              { token: 'Pill margin top (scrolled)', value: '14px' },
              { token: 'Autoplay duration', value: '5s per card' },
              { token: 'Background transition start', value: '60vh scroll' },
              { token: 'Background transition end', value: '220vh scroll' },
            ].map(({ token, value }) => (
              <div
                key={token}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{token}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'transparent',
          }}
        >
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>
            StudyHub Design System · 멋쟁이사자처럼 14기 · 2026
          </p>
        </div>
      </div>
    </>
  )
}
