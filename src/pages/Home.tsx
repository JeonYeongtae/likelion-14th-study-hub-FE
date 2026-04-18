/**
 * Home.tsx
 *
 * Scroll interactions:
 *  1. Light Hero   : Apple #f5f5f7 background, dark text, entrance animation
 *  2. BG Transition: useScroll + useTransform fades page bg #f5f5f7 → #050507
 *  3. GSAP Scenes  : sticky dark section, 3 text scenes on scroll progress
 *  4. Marquee      : double-row badge marquee
 *  5. Feature Grid : staggered scroll-reveal cards (3×2)
 *  6. Carousel     : Apple bento card carousel (indicator inside component)
 *  7. UI Showcase  : Liquid Glass controls demo
 *  8. CTA Outro    : full-screen call-to-action
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import CardCarousel, { DEFAULT_CAROUSEL_CARDS } from '../components/CardCarousel';
import StudyHubLogo from '../components/StudyHubLogo';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

// ─── Data ─────────────────────────────────────────────────────────────────────

const SCENES = [
  {
    label: 'Connect',
    title: '같은 목표,\n함께 달리는 사람들.',
    sub: '스터디 그룹을 만들고 동료를 찾아보세요. 혼자보다 훨씬 빠르게 성장합니다.',
    accent: 'from-orange-400 to-amber-400',
  },
  {
    label: 'Space',
    title: '공간이\n집중력을 만듭니다.',
    sub: '최적의 스터디룸을 실시간으로 예약하고, 방해 없는 환경에서 몰입하세요.',
    accent: 'from-sky-400 to-cyan-400',
  },
  {
    label: 'Community',
    title: '지식을 나누면\n두 배가 됩니다.',
    sub: '게시판에서 질문하고, 답변하고, 서로의 성장을 이끌어보세요.',
    accent: 'from-amber-400 to-orange-500',
  },
];

// ─── Header Showcase (헤더 전환 애니메이션 루프) ───────────────────────────────

function HeaderShowcase() {
  const [isPill, setIsPill] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIsPill((p) => !p), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: 20,
        padding: '0 0 64px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        minHeight: 160,
      }}
    >
      {/* 모의 페이지 콘텐츠 */}
      <div style={{ padding: '72px 28px 0' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: i === 1 ? 64 : 14,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              marginBottom: 10,
              width: i === 2 ? '65%' : i === 3 ? '42%' : '100%',
            }}
          />
        ))}
      </div>

      {/* 애니메이션 헤더 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <motion.div
          animate={
            isPill
              ? { width: 248, borderRadius: 50, marginTop: 10 }
              : { width: '100%', borderRadius: 0, marginTop: 0 }
          }
          transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
          style={{
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(245,245,247,0.90)',
            height: 46,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              width: '100%',
              padding: '0 20px',
              gap: 8,
            }}
          >
            {/* 로고 플레이스홀더 — 좌측 */}
            <div style={{ width: 56, height: 14, background: '#1D1D1F', borderRadius: 3, opacity: 0.6 }} />

            {/* 중앙: 내비게이션 ↔ 페이지 타이틀 */}
            <AnimatePresence mode="wait">
              {!isPill ? (
                <motion.div
                  key="nav"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', gap: 20, justifyContent: 'center' }}
                >
                  {['스터디룸', '커뮤니티', '그룹'].map((l) => (
                    <div key={l} style={{ fontSize: 11, color: '#6e6e73', whiteSpace: 'nowrap' }}>
                      {l}
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ fontSize: 11, color: '#6e6e73', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  스터디 허브
                </motion.div>
              )}
            </AnimatePresence>

            {/* 유저 아이콘 — 우측 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.25)' }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 상태 레이블 */}
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={isPill ? 'pill' : 'full'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.22)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {isPill ? 'Dynamic — 스크롤 후' : 'Default — 최상단'}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Scene Text ───────────────────────────────────────────────────────────────

function SceneText({ label, title, sub, accent, visible }: (typeof SCENES)[0] & { visible: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -28 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <span className="mb-4 text-[10px] font-semibold tracking-[0.35em] uppercase text-[#E07535]">{label}</span>
          <h2
            className="text-4xl md:text-6xl font-semibold leading-tight text-white"
            style={{ letterSpacing: '-0.04em' }}
          >
            {title.split('\n').map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? (
                  <span className={`bg-linear-to-r ${accent} bg-clip-text text-transparent`}>{line}</span>
                ) : (
                  line
                )}
              </span>
            ))}
          </h2>
          <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-white/45">{sub}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const lightHeroRef = useRef<HTMLElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [activeScene, setActiveScene] = useState(-1);
  const navigate = useNavigate();

  const handleLogin = () => navigate('/auth');

  // ── Fixed background: tracks document scroll Y, not a single section ────────
  // scrollY goes 0 → 100vh (first screen) to complete the transition.
  // Using raw scrollY pixels so the speed feels physical, not section-relative.
  const { scrollY } = useScroll();
  // Transition starts after 40 % of first viewport is scrolled,
  // and completes just as the sticky section begins (~105 vh) —
  // background is fully dark before any scene content fades in.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const bgColor = useTransform(scrollY, [vh * 0.4, vh * 1.05], ['#f5f5f7', '#050507']);

  // ── GSAP sticky scenes ────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: scrollWrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: stickyRef.current,
        pinSpacing: false,
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          if (p < 0.15) setActiveScene(-1);
          else if (p < 0.42) setActiveScene(0);
          else if (p < 0.68) setActiveScene(1);
          else if (p < 0.88) setActiveScene(2);
          else setActiveScene(-1);
        },
      });
    }, scrollWrapRef);
    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Fixed background layer — sits behind everything, darkens as you scroll */}
      <motion.div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundColor: bgColor,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. LIGHT HERO                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={lightHeroRef}
        className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        <StudyHubLogo size={320} variant="hero" />

        {/* Login button */}
        <motion.button
          onClick={handleLogin}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{
            marginTop: 36,
            borderRadius: 9999,
            padding: '10px 32px',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            background: '#0071e3',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          로그인
        </motion.button>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. GSAP STICKY SCENES                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div ref={scrollWrapRef} style={{ height: '600vh' }}>
        <div
          ref={stickyRef}
          className="relative flex h-screen w-full items-center justify-center overflow-hidden"
          style={{ backgroundColor: 'transparent' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(224,117,53,0.14) 0%, transparent 70%)',
            }}
          />

          <div className="absolute inset-0 z-10 pointer-events-none">
            {SCENES.map((scene, i) => (
              <SceneText key={scene.label} {...scene} visible={activeScene === i} />
            ))}
          </div>

          <AnimatePresence>
            {activeScene === -1 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-semibold tracking-[0.4em] uppercase select-none"
                style={{ color: 'rgba(255,255,255,0.1)', zIndex: 10 }}
              >
                스터디 허브
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. APPLE BENTO CAROUSEL                                             */}
      {/*                                                                     */}
      {/* Section bg (#111118) is slightly lighter than card bg (#06060e)     */}
      {/* so the 48px padding around each card creates a visible frame.       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: 'transparent', paddingTop: 80, paddingBottom: 80 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
          style={{ marginBottom: 40 }}
        >
          <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-[#E07535]">Core Features</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold text-white" style={{ letterSpacing: '-0.03em' }}>
            스터디 허브의
            <br />
            <span className="text-white/35">모든 것.</span>
          </h2>
        </motion.div>

        {/* Carousel — indicator is built-in, no external wrapper needed */}
        <CardCarousel cards={DEFAULT_CAROUSEL_CARDS} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. HEADER SHOWCASE                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24" style={{ backgroundColor: 'transparent' }}>
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 text-center"
          >
            <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-[#E07535]">
              Immersive UX
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold text-white" style={{ letterSpacing: '-0.03em' }}>
              스크롤할수록
              <br />
              <span className="text-white/35">더 깊이 몰입됩니다.</span>
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/40 max-w-sm mx-auto">
              페이지를 내릴수록 헤더가 작고 섬세한 다이나믹 바로 전환되며,
              <br />
              콘텐츠에 온전히 집중할 수 있는 환경을 만들어줍니다.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeaderShowcase />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. OUTRO / CTA                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{ backgroundColor: 'transparent' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(224,117,53,0.4) 40%, rgba(251,191,36,0.4) 60%, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 55% 38% at 50% 55%, rgba(224,117,53,0.12) 0%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <span className="mb-6 text-[10px] font-semibold tracking-[0.35em] uppercase text-[#E07535]">
            지금 시작하세요
          </span>
          <h2
            className="max-w-2xl text-4xl md:text-6xl font-semibold leading-tight text-white"
            style={{ letterSpacing: '-0.04em' }}
          >
            당신의 스터디,
            <br />
            <span className="bg-linear-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              더 스마트하게.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-white/38">
            스터디 허브에서 팀을 꾸리고, 공간을 예약하고,
            <br />
            지식을 나누세요.
          </p>
          <div className="mt-12">
            <motion.button
              onClick={handleLogin}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-full px-10 py-3.5 text-sm font-semibold text-white"
              style={{ background: '#E07535', letterSpacing: '-0.01em' }}
            >
              로그인
            </motion.button>
          </div>
        </motion.div>

        <p className="absolute bottom-8 text-[11px] font-light text-white/18">
          © 2026 멋쟁이사자처럼 14기 StudyHub. All rights reserved.
        </p>
      </section>
    </>
  );
}
