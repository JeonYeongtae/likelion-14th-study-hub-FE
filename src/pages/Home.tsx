/**
 * Home.tsx — Landing Page (Full Redesign)
 *
 * Sections:
 *  1.  Hero              — Full-screen logo + CTA
 *  2.  GSAP Scenes       — 3 sticky dark scenes
 *  3.  Marquee           — Feature badge scroll (2 rows)
 *  4.  Why StudyHub      — 3 differentiator cards
 *  5.  Core Features     — Apple Bento Carousel
 *  6.  Dynamic Header    — Pill-mode showcase
 *  7.  Room Booking      — Date + timeslot interactive mock
 *  8.  Study Groups      — Application pipeline visual
 *  9.  Community         — Post + nested comment mock
 * 10.  Real-time Chat    — WebSocket chat UI mock
 * 11.  Liquid Glass UI   — 4-layer architecture showcase
 * 12.  Block Editor      — Drag-to-reorder editor demo
 * 13.  Notifications     — Alert system + feed mock
 * 14.  MyPage            — Dashboard preview
 * 15.  Tech Stack        — Libraries & design highlights
 * 16.  CTA Outro         — Final call to action
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CardCarousel, { DEFAULT_CAROUSEL_CARDS } from '../components/CardCarousel';
import Marquee from '../components/Marquee';
import StudyHubLogo from '../components/StudyHubLogo';
import CategorySelector from '../components/liquid-glass/CategorySelector';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

// ─── Shared helpers ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: string }) => (
  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.35em', textTransform: 'uppercase' as const, color: '#0071E3' }}>
    {children}
  </span>
);

const SectionTitle = ({ children, dim }: { children: React.ReactNode; dim?: string }) => (
  <h2 style={{ marginTop: 16, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.15 }}>
    {children}
    {dim && <><br /><span style={{ color: 'rgba(255,255,255,0.28)' }}>{dim}</span></>}
  </h2>
);

const SectionSub = ({ children }: { children: React.ReactNode }) => (
  <p style={{ marginTop: 16, fontSize: 14, fontWeight: 300, lineHeight: 1.75, color: 'rgba(255,255,255,0.42)', maxWidth: 480, margin: '16px auto 0' }}>
    {children}
  </p>
);

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const sectionStyle: React.CSSProperties = {
  padding: '100px 24px',
  backgroundColor: 'transparent',
};

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

const BADGES_ROW1 = [
  { label: '실시간 예약', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8' },
  { label: '실시간 채팅', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', dot: '#34d399' },
  { label: 'Liquid Glass UI', bg: 'rgba(0,113,227,0.14)', border: 'rgba(0,113,227,0.3)', dot: '#0071E3' },
  { label: '스터디 그룹', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)', dot: '#fbbf24' },
  { label: '커뮤니티 게시판', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', dot: '#a78bfa' },
  { label: '다이나믹 헤더', bg: 'rgba(0,113,227,0.14)', border: 'rgba(0,113,227,0.3)', dot: '#0071E3' },
  { label: '댓글 · 대댓글', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', dot: '#34d399' },
  { label: '게시글 에디터', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)', dot: '#fbbf24' },
  { label: '알림 센터', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.28)', dot: '#ff9f0a' },
  { label: '스크롤 애니메이션', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8' },
  { label: '자연스러운 움직임', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', dot: '#a78bfa' },
  { label: '마이페이지 대시보드', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', dot: '#34d399' },
];

const BADGES_ROW2 = [
  { label: '부드러운 화면 전환', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', dot: '#34d399' },
  { label: '스와이프 제스처', bg: 'rgba(0,113,227,0.14)', border: 'rgba(0,113,227,0.3)', dot: '#0071E3' },
  { label: '유리빛 컴포넌트', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8' },
  { label: '예약 시간 충돌 방지', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)', dot: '#fbbf24' },
  { label: '드래그로 순서 변경', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', dot: '#a78bfa' },
  { label: '좋아요 · 댓글', bg: 'rgba(255,69,58,0.12)', border: 'rgba(255,69,58,0.28)', dot: '#ff453a' },
  { label: '그룹 신청 · 수락', bg: 'rgba(0,113,227,0.14)', border: 'rgba(0,113,227,0.3)', dot: '#0071E3' },
  { label: '로딩 화면 처리', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.3)', dot: '#818cf8' },
  { label: '페이지 넘기기', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', dot: '#34d399' },
  { label: '이미지 업로드 · 전체 보기', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)', dot: '#fbbf24' },
  { label: '로그인 · 권한 관리', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', dot: '#a78bfa' },
  { label: '읽지 않은 메시지 수', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.28)', dot: '#ff9f0a' },
];

// ─── Scene Text ────────────────────────────────────────────────────────────────

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
          <span className="mb-4 text-[10px] font-semibold tracking-[0.35em] uppercase text-[#0071E3]">{label}</span>
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight text-white" style={{ letterSpacing: '-0.04em' }}>
            {title.split('\n').map((line, i) => (
              <span key={i} className="block">
                {i === 1
                  ? <span className={`bg-linear-to-r ${accent} bg-clip-text text-transparent`}>{line}</span>
                  : line}
              </span>
            ))}
          </h2>
          <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-white/45">{sub}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 2. Room Booking Showcase ──────────────────────────────────────────────────

function RoomBookingShowcase() {
  const dates = ['오늘', '내일', '수', '목', '금', '토', '일', '월', '화'];
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([10, 11]);
  const taken = [1, 2, 5, 6, 9];
  const mine = [12, 13];
  const hours = Array.from({ length: 14 }, (_, i) => `${9 + i}시`);

  const toggle = (i: number) => {
    if (taken.includes(i) || mine.includes(i)) return;
    setSelectedSlots(p => p.includes(i) ? p.filter(s => s !== i) : [...p, i]);
  };

  const state = (i: number) =>
    taken.includes(i) ? 'taken' : mine.includes(i) ? 'mine' : selectedSlots.includes(i) ? 'selected' : 'avail';

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Study Room</SectionLabel>
          <SectionTitle dim="지금 바로 예약.">원하는 시간을</SectionTitle>
          <SectionSub>
            날짜를 고르고 원하는 시간 칸을 탭하면 예약이 완성됩니다.
            색깔로 빈 시간·예약됨·내 예약을 한눈에 구분할 수 있어요.
          </SectionSub>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} style={{ background: '#06060e', borderRadius: 28, padding: 'clamp(20px,3vw,36px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {dates.map((d, i) => (
              <button key={d} onClick={() => { setSelectedDate(i); setSelectedSlots([]); }} style={{ flexShrink: 0, padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: i === selectedDate ? 600 : 400, background: i === selectedDate ? '#0071E3' : 'rgba(255,255,255,0.06)', color: i === selectedDate ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: 8, marginBottom: 24 }}>
            {hours.map((h, i) => {
              const s = state(i);
              return (
                <motion.button key={h} onClick={() => toggle(i)} whileTap={s === 'avail' ? { scale: 0.90 } : {}} style={{ padding: '10px 4px', borderRadius: 10, border: 'none', cursor: s === 'avail' ? 'pointer' : 'default', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s', background: s === 'taken' ? 'rgba(255,59,48,0.2)' : s === 'mine' ? 'rgba(52,199,89,0.2)' : s === 'selected' ? 'rgba(0,113,227,0.38)' : 'rgba(255,255,255,0.06)', color: s === 'taken' ? 'rgba(255,69,58,0.8)' : s === 'mine' ? 'rgba(52,199,89,0.95)' : s === 'selected' ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {h}
                </motion.button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { l: '예약 가능', bg: 'rgba(255,255,255,0.06)', c: 'rgba(255,255,255,0.5)' },
              { l: '선택됨', bg: 'rgba(0,113,227,0.38)', c: '#fff' },
              { l: '예약됨', bg: 'rgba(255,59,48,0.2)', c: 'rgba(255,69,58,0.8)' },
              { l: '내 예약', bg: 'rgba(52,199,89,0.2)', c: 'rgba(52,199,89,0.95)' },
            ].map(({ l, bg, c }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 22, borderRadius: 6, background: bg, fontSize: 10, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>샘</div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Flow steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
          {[
            { n: '1', title: '날짜 선택', desc: '오늘부터 2주 이내 원하는 날 선택' },
            { n: '2', title: '시간 선택', desc: '여러 시간 칸을 연속으로 선택 가능' },
            { n: '3', title: '예약 완료', desc: '즉시 반영되며 언제든 취소 가능' },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#0071E3', fontWeight: 700, marginBottom: 6 }}>Step {n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. Study Group Pipeline ───────────────────────────────────────────────────

function GroupPipelineShowcase() {
  const steps = [
    { icon: '✏️', label: '그룹 만들기', desc: '이름, 소개, 최대 인원을 정하고 멤버 모집을 시작합니다.', color: 'rgba(99,102,241,0.22)' },
    { icon: '📣', label: '멤버 모집', desc: '관심 있는 사람들이 한마디를 남기고 가입을 신청합니다.', color: 'rgba(0,113,227,0.22)' },
    { icon: '👀', label: '신청 검토', desc: '리더가 신청서를 확인하고 받아들이거나 거절할 수 있습니다.', color: 'rgba(251,191,36,0.18)' },
    { icon: '✅', label: '그룹 확정', desc: '정원이 차면 리더가 그룹을 확정하고 모집이 마감됩니다.', color: 'rgba(52,199,89,0.18)' },
    { icon: '💬', label: '채팅 시작', desc: '확정된 멤버만 들어갈 수 있는 전용 채팅방이 열립니다.', color: 'rgba(52,211,153,0.18)' },
  ];

  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(s => (s + 1) % steps.length), 2200);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Study Groups</SectionLabel>
          <SectionTitle dim="모든 단계를 담았습니다.">그룹 형성의</SectionTitle>
          <SectionSub>
            그룹 만들기부터 채팅 시작까지 모든 과정이 하나로 이어집니다.
            리더와 멤버 역할이 나뉘어 체계적으로 운영됩니다.
          </SectionSub>
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {steps.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                onClick={() => setActive(i)}
                style={{
                  flex: 1, padding: 'clamp(14px,2vw,24px)', borderRadius: 20,
                  background: active === i ? '#06060e' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active === i ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                  cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {active === i && (
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${step.color} 0%, transparent 65%)` }} />
                )}
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{step.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active === i ? '#fff' : 'rgba(255,255,255,0.4)', marginBottom: 8, transition: 'color 0.35s' }}>{step.label}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,0.52)', opacity: active === i ? 1 : 0, transition: 'opacity 0.35s', minHeight: '3.3em' }}>
                    {step.desc}
                  </div>
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: i < active ? 'rgba(0,113,227,0.8)' : 'rgba(255,255,255,0.1)', transition: 'color 0.35s' }}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Member slider demo label */}
        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} style={{ marginTop: 20, padding: '18px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,113,227,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎚️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>최대 인원 슬라이더</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>2~20명 범위로 조절 가능한 유리빛 슬라이더. 드래그하거나 트랙을 클릭해 최대 인원을 설정합니다.</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 4. Community Showcase (PostDetailPage style) ─────────────────────────────

function CommunityShowcase() {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  const handleLike = () => {
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const COMMENTS = [
    {
      id: 1, name: '박개발', time: '1시간 전', hue: (2 * 37) % 360,
      text: '저는 zustand부터 시작했는데 진입 장벽이 낮아서 좋았습니다. API도 직관적이고 보일러플레이트가 거의 없어요!',
      replies: [{ id: 11, name: '이리액트', time: '30분 전', hue: (3 * 37) % 360, text: '동의합니다! 소규모 → zustand, 대규모 → jotai 순서도 좋은 것 같아요.' }],
    },
    {
      id: 2, name: '최프론트', time: '20분 전', hue: (4 * 37) % 360,
      text: 'Context API로 시작해서 한계를 느끼면 외부 라이브러리로 넘어가는 게 이해에 더 도움됐어요.',
      replies: [],
    },
  ];

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Community</SectionLabel>
          <SectionTitle dim="함께 성장합니다.">질문하고, 답하고,</SectionTitle>
          <SectionSub>
            이미지와 텍스트를 자유롭게 배치하고, 댓글·대댓글로 깊은 토론을 이어가세요.
            좋아요와 조회수로 인기 게시글을 바로 발견할 수 있습니다.
          </SectionSub>
        </motion.div>

        {/* PostDetailPage 실제 레이아웃 */}
        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }} style={{ background: '#f5f5f7', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>

          {/* Back nav */}
          <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6e6e73' }}>
            ← 커뮤니티로
          </div>

          {/* Article card */}
          <div style={{ margin: '14px 20px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '0.5px solid rgba(255,255,255,0.6)', borderRadius: 20, padding: '24px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset' }}>
            {/* Category badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', fontSize: 10, color: '#818cf8', fontWeight: 700, marginBottom: 12 }}>공부법</div>

            {/* Title */}
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.3 }}>
              React 상태관리 어떻게 공부하셨나요?
            </h1>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#aeaeb2', marginBottom: 20, flexWrap: 'wrap' as const }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `hsl(${(1*37)%360}, 50%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>K</div>
                <span style={{ color: '#1d1d1f', fontWeight: 500 }}>김스터디</span>
              </span>
              <span>2026.04.12 14:20</span>
              <span>조회 128</span>
            </div>

            {/* Content */}
            <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.8, marginBottom: 22, paddingBottom: 20, borderBottom: '1px solid #f2f2f7' }}>
              useState는 어느 정도 익숙한데 zustand와 jotai 중에 무엇을 먼저 공부하면 좋을지 고민 중입니다.{' '}
              실무에서는 어떤 걸 주로 쓰시나요?
            </div>

            {/* Like / comment / view */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
              <motion.button onClick={handleLike} whileTap={{ scale: 0.84 }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 999, border: `1px solid ${liked ? 'rgba(255,59,48,0.35)' : '#e5e5ea'}`, background: liked ? 'rgba(255,59,48,0.07)' : '#f5f5f7', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: liked ? '#ff3b30' : '#6e6e73', transition: 'all 0.2s' }}>
                <motion.span animate={{ scale: liked ? [1, 1.5, 1] : 1 }} transition={{ duration: 0.25 }}>{liked ? '♥' : '♡'}</motion.span>
                {likeCount}
              </motion.button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6e6e73' }}>💬 12</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6e6e73' }}>👁 128</div>
            </div>

            {/* Comments */}
            <div style={{ borderTop: '1px solid #f2f2f7', paddingTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 14 }}>댓글 12개</div>

              {COMMENTS.map(c => (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `hsl(${c.hue}, 50%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: '#aeaeb2' }}>{c.time}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.65, color: '#3c3c43', margin: '0 0 5px' }}>{c.text}</p>
                      <button onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)} style={{ fontSize: 11, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>답글 달기</button>

                      {/* Nested replies */}
                      {c.replies.map(r => (
                        <div key={r.id} style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #e5e5ea' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `hsl(${r.hue}, 50%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{r.name[0]}</div>
                            <div>
                              <div style={{ display: 'flex', gap: 7, alignItems: 'baseline', marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{r.name}</span>
                                <span style={{ fontSize: 10, color: '#aeaeb2' }}>{r.time}</span>
                              </div>
                              <p style={{ fontSize: 12, color: '#3c3c43', lineHeight: 1.6, margin: 0 }}>{r.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Reply input (toggled) */}
                      <AnimatePresence>
                        {activeReplyId === c.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ display: 'flex', gap: 7, alignItems: 'center', background: '#f5f5f7', borderRadius: 22, padding: '5px 5px 5px 13px', border: '1px solid #e5e5ea' }}>
                              <input readOnly placeholder="답글을 입력하세요..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#1d1d1f', fontFamily: 'inherit' }} />
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0071E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>↑</div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ))}

              {/* Main comment input */}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 6, background: '#f5f5f7', borderRadius: 24, padding: '7px 7px 7px 16px', border: '1px solid #e5e5ea' }}>
                <input readOnly placeholder="댓글을 입력하세요..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#1d1d1f', fontFamily: 'inherit' }} />
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0071E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>↑</div>
              </div>
            </div>
          </div>

        </motion.div>

        {/* Feature callouts — preview 박스 바깥 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 16 }}>
          {[
            { icon: '📝', title: '게시글 에디터', desc: '텍스트와 이미지를 드래그로 자유롭게 재배치. 사진 최대 5장 업로드.' },
            { icon: '🖼️', title: '이미지 크게 보기', desc: '게시글 이미지를 클릭하면 전체화면으로 확대해서 감상할 수 있습니다.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. Chat Showcase (GroupChatPage 3-panel style) ────────────────────────────

function ChatShowcase() {
  const CHAT_ROOMS = [
    { id: 1, title: '알고리즘 스터디', last: '오늘 오후 3시에 스터디!', time: '14:32', unread: 3, leader: true },
    { id: 2, title: 'React 심화반', last: 'isFetching 차이가 뭔가요?', time: '어제', unread: 0, leader: false },
    { id: 3, title: '취업 준비 그룹', last: '이번 주 목표 공유해요!', time: '월', unread: 1, leader: false },
  ];

  const MESSAGES = [
    { id: 1, mine: false, text: '오늘 오후 3시에 스터디 진행할게요! 🙌', time: '14:32', initial: '박', hue: (2*47+120)%360, name: '박개발' },
    { id: 2, mine: true, text: '네, 참석할게요 👍', time: '14:33' },
    { id: 3, mine: false, text: 'React Query 관련 질문 있으신 분 있나요?', time: '14:35', initial: '김', hue: (3*47+120)%360, name: '김스터디' },
    { id: 4, mine: true, text: '저요! isLoading이랑 isFetching 차이가 헷갈려요', time: '14:36' },
    { id: 5, mine: false, text: 'isLoading은 캐시 없을 때만 true, isFetching은 background refetch까지 포함해요!', time: '14:37', initial: '박', hue: (2*47+120)%360, name: '박개발' },
  ];

  const [visible, setVisible] = useState(3);
  const [selectedRoom, setSelectedRoom] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setVisible(v => (v >= MESSAGES.length ? 3 : v + 1)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Real-time Chat</SectionLabel>
          <SectionTitle dim="전용 채팅 공간.">그룹만의</SectionTitle>
          <SectionSub>
            그룹이 확정되는 순간 전용 채팅방이 자동으로 열립니다.
            실시간 메시지, 공지사항, 읽지 않은 메시지 수까지 한눈에 확인하세요.
          </SectionSub>
        </motion.div>

        {/* GroupChatPage 3-panel mock */}
        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }} style={{ background: '#f0f0f5', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', height: 500 }}>

          {/* ── Left: Liquid Glass sidebar ── */}
          <div style={{ width: 210, flexShrink: 0, padding: '8px 6px', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ height: '100%', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.74)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', boxShadow: '0 4px 28px rgba(0,0,0,0.09), 0 1px 0 rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.55)' }}>
              <div style={{ padding: '18px 14px 10px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.32)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 2px' }}>Study Hub</p>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.03em' }}>채팅</h2>
              </div>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 10px 6px' }} />
              <div style={{ padding: '0 6px' }}>
                {CHAT_ROOMS.map((room, i) => {
                  const hue = (room.id * 53 + 180) % 360;
                  return (
                    <button key={room.id} onClick={() => setSelectedRoom(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 8px', borderRadius: 11, marginBottom: 3, background: selectedRoom === i ? 'rgba(255,255,255,0.92)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', boxShadow: selectedRoom === i ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none', transition: 'background 0.18s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${hue}, 48%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.14)' }}>{room.title[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: selectedRoom === i ? 600 : 500, color: selectedRoom === i ? '#0071E3' : '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>{room.title}</span>
                          <span style={{ fontSize: 9, color: '#aeaeb2', flexShrink: 0 }}>{room.time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#aeaeb2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>{room.last}</span>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {room.leader && <span style={{ fontSize: 8, fontWeight: 600, color: '#0071E3', background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.2)', borderRadius: 999, padding: '1px 4px' }}>조장</span>}
                            {room.unread > 0 && <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{room.unread}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Center: Chat area ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ height: 52, flexShrink: 0, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `hsl(${(CHAT_ROOMS[selectedRoom].id * 53 + 180) % 360}, 48%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{CHAT_ROOMS[selectedRoom].title[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{CHAT_ROOMS[selectedRoom].title}</div>
                <div style={{ fontSize: 10, color: '#aeaeb2' }}>멤버 4명</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.25)', fontSize: 10, color: '#30d158', fontWeight: 600 }}>리더</span>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,59,48,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>3</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'hidden' }}>
              {MESSAGES.slice(0, visible).map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }} style={{ display: 'flex', flexDirection: msg.mine ? 'row-reverse' : 'row', gap: 7, alignItems: 'flex-end' }}>
                  {!msg.mine && <div style={{ width: 24, height: 24, borderRadius: '50%', background: `hsl(${msg.hue}, 55%, 52%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{msg.initial}</div>}
                  <div style={{ maxWidth: '72%' }}>
                    {!msg.mine && <div style={{ fontSize: 10, color: '#aeaeb2', marginBottom: 3, fontWeight: 600 }}>{msg.name}</div>}
                    <div style={{ padding: '8px 12px', borderRadius: msg.mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.mine ? 'rgba(0,113,227,0.88)' : 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 1.55, color: msg.mine ? '#fff' : '#1d1d1f', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>{msg.text}</div>
                    <div style={{ fontSize: 9, color: '#aeaeb2', marginTop: 3, textAlign: msg.mine ? 'right' : 'left' }}>{msg.time}</div>
                  </div>
                </motion.div>
              ))}
              {visible < MESSAGES.length && (
                <div style={{ display: 'flex', gap: 4, paddingLeft: 31 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: '#aeaeb2' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '9px 12px', borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.72)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: 20, padding: '8px 14px', fontSize: 12, color: '#aeaeb2' }}>메시지를 입력하세요...</div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,113,227,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>↑</div>
            </div>
          </div>

          {/* ── Right: Notice + Members ── */}
          <div style={{ width: 176, flexShrink: 0, borderLeft: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.52)', padding: '16px 12px', overflowY: 'auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.32)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 7px' }}>공지</p>
            <div style={{ fontSize: 11, color: '#3a2010', lineHeight: 1.55, background: 'rgba(255,248,240,0.9)', borderRadius: 8, padding: '7px 9px', marginBottom: 16 }}>
              오늘 스터디 주제: 동적 프로그래밍 기초 — 모두 예제 2문제 풀어오기!
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 12 }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.32)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>멤버</p>
            {[{ name: '박개발', leader: true, id: 2 }, { name: '김스터디', leader: false, id: 1 }, { name: '이리액트', leader: false, id: 3 }, { name: '최프론트', leader: false, id: 4 }].map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: `hsl(${(m.id*47+120)%360}, 55%, 52%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.name}</span>
                  {m.leader && <span style={{ fontSize: 8, fontWeight: 600, color: '#0071E3', background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.2)', borderRadius: 999, padding: '1px 4px', flexShrink: 0 }}>조장</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature bullets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 16 }}>
          {[
            { label: '읽지 않은 메시지 수 표시', icon: '🔴' },
            { label: '그룹 확정 후 채팅방 자동 오픈', icon: '🔓' },
            { label: '공지사항 확인 · 전체 보기', icon: '📌' },
            { label: '최근 메시지 순서로 목록 정렬', icon: '📋' },
          ].map(({ label, icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 6. Liquid Glass UI Showcase ──────────────────────────────────────────────

function LiquidGlassShowcase() {
  const [catDemo, setCatDemo] = useState('all');

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Liquid Glass UI</SectionLabel>
          <SectionTitle dim="유리빛 UI 시스템.">한 겹씩 쌓아 만든</SectionTitle>
          <SectionSub>
            마치 실제 유리처럼 뒷 배경을 은은하게 비추는 UI 시스템.
            버튼, 탭, 카드 어디에나 자연스럽게 어우러집니다.
          </SectionSub>
        </motion.div>

        {/* 4-Layer Architecture */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 32 }}>
          {[
            { layer: 'Layer 1', name: '유리 효과', desc: '뒷 배경이 은은하게 비쳐 보이는 반투명 유리 효과를 만들어냅니다', color: 'rgba(0,113,227,0.18)', b: 'rgba(0,113,227,0.28)' },
            { layer: 'Layer 2', name: '색조 레이어', desc: '상황에 따라 색조를 더해 유리에 어울리는 색감을 입힙니다', color: 'rgba(99,102,241,0.14)', b: 'rgba(99,102,241,0.24)' },
            { layer: 'Layer 3', name: '빛 반사 테두리', desc: '빛이 닿는 듯한 테두리 효과로 유리의 입체감을 살립니다', color: 'rgba(255,255,255,0.07)', b: 'rgba(255,255,255,0.16)' },
            { layer: 'Layer 4', name: '콘텐츠', desc: '텍스트와 아이콘은 흐림 효과 없이 항상 선명하게 표시됩니다', color: 'rgba(52,211,153,0.1)', b: 'rgba(52,211,153,0.2)' },
          ].map((l, i) => (
            <motion.div key={l.layer} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.07 }} style={{ padding: 18, borderRadius: 16, background: l.color, border: `1px solid ${l.b}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{l.layer}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{l.name}</div>
              <div style={{ fontSize: 11, lineHeight: 1.55, color: 'rgba(255,255,255,0.38)' }}>{l.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Live glass demos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
          {[
            { cls: 'liquid', label: '.liquid', desc: '반투명한 기본 유리 스타일. 메뉴·일반 버튼에 사용됩니다', text: '기본 버튼' },
            { cls: 'liquid liquid-accent', label: '.liquid-accent', desc: '파란 유리 스타일. 검색·필터 등 보조 기능에 어울립니다', text: '검색 / 보조' },
            { cls: 'liquid liquid-action', label: '.liquid-action', desc: '진한 파란색. 가장 중요한 행동 버튼에 사용됩니다', text: '주요 버튼' },
          ].map(({ cls, label, desc, text }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} style={{ background: '#f5f5f7', borderRadius: 20, padding: 22, border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.35)', marginBottom: 14 }}>{label}</div>
              <button className={cls} style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{text}</button>
              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', marginTop: 12, lineHeight: 1.5 }}>{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CategorySelector — live demo */}
        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} style={{ borderRadius: 20, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>🎛️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>탭 필터 — 유리처럼 미끄러지는 탭</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', lineHeight: 1.6, margin: '0 0 18px' }}>
              탭을 누르거나 드래그하면 활성 표시가 유리처럼 부드럽게 미끄러집니다. 가장 가까운 탭에 자동으로 달라붙어 선택됩니다.
            </p>
            <CategorySelector
              categories={[
                { id: 'all',       label: '전체' },
                { id: 'room',      label: '스터디룸' },
                { id: 'group',     label: '그룹' },
                { id: 'community', label: '커뮤니티' },
                { id: 'chat',      label: '채팅' },
              ]}
              selected={catDemo}
              onSelect={setCatDemo}
              theme="light"
            />
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
          <div style={{ padding: '14px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.28)' }}>선택됨</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }}>{catDemo}</span>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>— 어두운 배경·밝은 배경 모두 지원</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 7. Block Editor Showcase ──────────────────────────────────────────────────

function BlockEditorShowcase() {
  const [blocks, setBlocks] = useState([
    { id: 'img', type: 'image', label: '🖼️  cover.png', rep: true },
    { id: 'txt', type: 'text', label: '안녕하세요! 오늘 공부한 내용을 정리해봤습니다...' },
    { id: 'img2', type: 'image', label: '🖼️  diagram.png' },
  ]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const arr = [...blocks];
    const from = arr.findIndex(b => b.id === fromId);
    const to = arr.findIndex(b => b.id === toId);
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setBlocks(arr);
  };

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Block Editor</SectionLabel>
          <SectionTitle dim="자유롭게 구성.">글과 이미지를</SectionTitle>
          <SectionSub>
            텍스트와 이미지를 원하는 대로 추가하고 드래그로 순서를 바꿔보세요.
            대표 이미지 설정, 사진 최대 5장 업로드를 지원합니다.
          </SectionSub>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} style={{ background: '#06060e', borderRadius: 28, padding: '28px 28px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>↕️</span> 블록을 드래그해서 순서를 바꿔보세요
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blocks.map(block => (
              <motion.div
                key={block.id}
                layout
                draggable
                onDragStart={() => setDragging(block.id)}
                onDragEnd={() => { if (over && dragging) reorder(dragging, over); setDragging(null); setOver(null); }}
                onDragOver={e => { e.preventDefault(); setOver(block.id); }}
                whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 10 }}
                style={{
                  padding: '14px 16px', borderRadius: 14, cursor: 'grab',
                  background: over === block.id && dragging !== block.id ? 'rgba(0,113,227,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${over === block.id && dragging !== block.id ? 'rgba(0,113,227,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 0.2s, border-color 0.2s',
                  opacity: dragging === block.id ? 0.4 : 1,
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'grab', userSelect: 'none' }}>⠿⠿</span>
                <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.label}</span>
                {block.rep && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,113,227,0.25)', border: '1px solid rgba(0,113,227,0.4)', color: '#60a5fa', fontWeight: 600, flexShrink: 0 }}>대표</span>
                )}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{block.type === 'image' ? '🖼️' : '📝'}</span>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            {['+ 텍스트 추가', '+ 이미지 추가'].map(l => (
              <button key={l} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {l}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 8. Notifications Showcase ────────────────────────────────────────────────

const NOTIF_TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  comment:     { icon: '💬', color: '#0071E3', bg: '#e8f0fe' },
  chat:        { icon: '🗨️', color: '#0071E3', bg: '#e8f0fe' },
  like:        { icon: '♥',  color: '#ff3b30', bg: '#fde8e8' },
  application: { icon: '📋', color: '#0071e3', bg: '#e8f0fe' },
  accepted:    { icon: '✅', color: '#34c759', bg: '#e8fde8' },
  rejected:    { icon: '❌', color: '#ff3b30', bg: '#fde8e8' },
  system:      { icon: '⚙️', color: '#6e6e73', bg: '#f2f2f7' },
};

const NOTIF_TYPE_LABEL: Record<string, string> = {
  comment: '댓글', like: '좋아요', chat: '채팅',
  application: '스터디 신청', accepted: '스터디 수락',
  rejected: '스터디 거절', system: '시스템',
};

function NotificationsShowcase() {
  const notifData = [
    { type: 'like',        text: '박개발님이 회원님의 게시글에 좋아요를 눌렀습니다.', time: '방금 전', read: false },
    { type: 'comment',     text: '이리액트님이 댓글을 달았습니다: "동의합니다! zustand 진짜 좋아요"', time: '5분 전', read: false },
    { type: 'accepted',    text: '알고리즘 스터디 그룹 가입이 수락되었습니다.', time: '1시간 전', read: true },
    { type: 'application', text: '새로운 스터디 그룹 신청이 도착했습니다.', time: '2시간 전', read: true },
    { type: 'system',      text: '시스템 점검 안내: 2026.05.05 02:00 ~ 04:00', time: '3시간 전', read: true },
  ];

  const notifCategories = [
    { id: 'all',     label: '전체' },
    { id: 'comment', label: '댓글' },
    { id: 'like',    label: '좋아요' },
    { id: 'study',   label: '스터디' },
    { id: 'system',  label: '시스템' },
  ];
  const [notifCat, setNotifCat] = useState('all');

  const filtered = notifData.filter(n => {
    if (notifCat === 'all')     return true;
    if (notifCat === 'comment') return n.type === 'comment' || n.type === 'chat';
    if (notifCat === 'like')    return n.type === 'like';
    if (notifCat === 'study')   return ['accepted', 'application', 'rejected'].includes(n.type);
    if (notifCat === 'system')  return n.type === 'system';
    return true;
  });

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Notifications</SectionLabel>
          <SectionTitle dim="즉시 알려드립니다.">모든 활동을</SectionTitle>
          <SectionSub>
            댓글, 좋아요, 채팅, 그룹 수락·거절까지 카테고리별로 모아볼 수 있습니다.
            알림을 탭하면 관련 게시글이나 그룹으로 바로 이동합니다.
          </SectionSub>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }} style={{ background: '#f5f5f7', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
          {/* Header + CategorySelector */}
          <div style={{ padding: '18px 20px 14px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>알림</h2>
              <span style={{ fontSize: 11, color: '#0071E3', cursor: 'pointer' }}>전체 읽음</span>
            </div>
            <CategorySelector
              categories={notifCategories}
              selected={notifCat}
              onSelect={setNotifCat}
              theme="light"
            />
          </div>

          {/* Notification list */}
          <div style={{ minHeight: 340 }}>
            <AnimatePresence mode="wait">
              <motion.div key={notifCat} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {filtered.map((n, i) => {
                  const meta = NOTIF_TYPE_META[n.type] ?? { icon: '🔔', color: '#6e6e73', bg: '#f2f2f7' };
                  const label = NOTIF_TYPE_LABEL[n.type] ?? '알림';
                  return (
                    <motion.div
                      key={`${n.type}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      style={{
                        padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: 13,
                        background: !n.read ? 'rgba(0,113,227,0.04)' : '#fff',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{label}</span>
                          <span style={{ fontSize: 10, color: '#aeaeb2' }}>{n.time}</span>
                          {!n.read && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0071E3', display: 'inline-block', flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: 12, color: n.read ? '#aeaeb2' : '#1d1d1f', lineHeight: 1.55, margin: 0 }}>{n.text}</p>
                      </div>
                      <span style={{ fontSize: 12, color: '#c7c7cc', flexShrink: 0, alignSelf: 'center' }}>›</span>
                    </motion.div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#aeaeb2' }}>해당 카테고리 알림이 없습니다.</div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 9. MyPage Preview ────────────────────────────────────────────────────────

function MyPageShowcase() {
  const tabs = ['프로필', '게시글', '댓글', '좋아요', '예약', '스터디', '보안'];
  const [activeTab, setActiveTab] = useState('프로필');

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>My Page</SectionLabel>
          <SectionTitle dim="한 곳에서 관리.">나의 모든 활동을</SectionTitle>
          <SectionSub>
            내가 쓴 게시글, 댓글, 누른 좋아요, 예약 내역, 스터디까지. 내 모든 활동을 탭 하나로 확인하고 관리할 수 있습니다.
          </SectionSub>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14 }}>
          {/* Sidebar */}
          <div style={{ background: '#06060e', borderRadius: 24, padding: 20, border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,113,227,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px', backdropFilter: 'blur(8px)', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25)' }}>😊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>김스터디</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>studyhub@likelion.net</div>
              <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: 'rgba(0,113,227,0.2)', border: '1px solid rgba(0,113,227,0.35)', fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>일반</div>
            </div>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: 'inherit', background: activeTab === t ? 'rgba(0,113,227,0.2)' : 'transparent', color: activeTab === t ? '#60a5fa' : 'rgba(255,255,255,0.42)', fontWeight: activeTab === t ? 600 : 400, transition: 'all 0.2s' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ background: '#06060e', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{activeTab}</div>
                {activeTab === '프로필' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[{ label: '닉네임', value: '김스터디', editable: true }, { label: '이메일', value: 'studyhub@likelion.net' }, { label: '역할', value: '일반 회원' }, { label: '가입일', value: '2026년 1월 5일' }].map(({ label, value, editable }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 80, fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{label}</div>
                        <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{value}</div>
                        {editable && <button style={{ fontSize: 11, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>수정</button>}
                      </div>
                    ))}
                  </div>
                )}
                {activeTab !== '프로필' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <div style={{ height: 10, width: `${[70, 55, 80][i - 1]}%`, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
                        </div>
                        <div style={{ height: 8, width: '45%', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── 10. Tech Stack ────────────────────────────────────────────────────────────

// ─── 11. Why StudyHub ─────────────────────────────────────────────────────────

function WhySection() {
  const items = [
    {
      icon: '🔗',
      title: '통합 학습 플랫폼',
      desc: '스터디룸 예약 · 그룹 형성 · 커뮤니티 · 실시간 채팅을 하나의 앱에서 완결. 탭 전환 없이 모든 학습 흐름이 연결됩니다.',
      accent: 'rgba(99,102,241,0.22)',
    },
    {
      icon: '🪟',
      title: 'Liquid Glass 디자인 시스템',
      desc: '마치 유리처럼 빛을 굴절시키는 독자적인 디자인 시스템. 버튼, 탭, 카드가 하나의 통일된 유리빛 언어로 완성됩니다.',
      accent: 'rgba(0,113,227,0.22)',
    },
    {
      icon: '⚡',
      title: '실시간 연동 경험',
      desc: '그룹 채팅, 실시간 예약 상태, 카테고리별 알림으로 항상 최신 소식을 놓치지 않습니다.',
      accent: 'rgba(52,211,153,0.18)',
    },
  ];

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Why Study Hub</SectionLabel>
          <SectionTitle dim="학습 생태계.">하나로 연결된</SectionTitle>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
          {items.map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }} style={{ background: '#06060e', borderRadius: 24, padding: '36px 30px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '55%', background: `radial-gradient(circle at 100% 0%, ${item.accent} 0%, transparent 60%)` }} />
              <div style={{ fontSize: 32, marginBottom: 20, position: 'relative' }}>{item.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12, letterSpacing: '-0.02em', position: 'relative' }}>{item.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', position: 'relative' }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Dynamic Header Section ───────────────────────────────────────────────────

// Phase 2 context titles — mirrors real pageTitle() output from Header.tsx
const SHOWCASE_CTX_TITLES = ['스터디룸', '게시글', '스터디 그룹', '채팅방'];

function HeaderShowcase({
  onPhaseChange,
  jumpTo,
}: {
  onPhaseChange?: (phase: number) => void;
  jumpTo?: { phase: number; id: number } | null;
}) {
  const [phase, setPhase] = useState(0); // 0: morph, 1: swipe, 2: ctx-title

  // 같은 페이즈 재클릭 포함 모든 점프를 강제 재시작시키는 카운터
  const [phaseResetKey, setPhaseResetKey] = useState(0);
  const lastJumpIdRef = useRef<number | null>(null);

  // Phase 0: full ↔ pill morph
  const [isPill, setIsPill] = useState(false);

  // Phase 1: swipe gesture simulation
  const [swipeDelta, setSwipeDelta] = useState(0); // px, negative=left, positive=right
  const [swipeCurrent, setSwipeCurrent] = useState('커뮤니티');
  const [swipeDest, setSwipeDest] = useState('스터디 그룹');
  const [swipeDir, setSwipeDir] = useState<-1 | 1>(-1); // -1=left swipe, 1=right swipe

  // Phase 2: context title cycling
  const [titleIdx, setTitleIdx] = useState(0);

  // Phase durations: 2 complete demo cycles
  // Phase 0: 4 morph flips × 2000ms = 8000ms + 1500ms wind-down
  // Phase 1: 2 swipe pairs × ~2000ms = 4000ms + 1500ms wind-down
  // Phase 2: 4 titles × 700ms × 2 passes = 5600ms + 1600ms wind-down
  // Phase 0: 4 morph flips × 2000ms = 8000ms + 1500ms wind-down
  // Phase 1: 3 swipe pairs × ~2200ms = 6600ms + 1400ms wind-down
  // Phase 2: 4 titles × 1400ms × ~2 passes = 11200ms → 7200ms (1 pass + buffer)
  const PHASE_DUR = [9500, 8000, 7200];
  // 각 페이즈 재생이 끝난 후 다음 페이즈로 넘어가기 전 2초 정지
  const BETWEEN_PAUSE = 2000;

  // true일 때 모든 내부 애니메이션이 정지되고 현재 상태를 유지
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => { onPhaseChange?.(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 기능 버튼 클릭 시 즉시 해당 페이즈로 점프 (같은 페이즈 재클릭도 재시작)
  useEffect(() => {
    if (!jumpTo || jumpTo.id === lastJumpIdRef.current) return;
    lastJumpIdRef.current = jumpTo.id;
    setPhase(jumpTo.phase);
    setIsPaused(false);
    setPhaseResetKey(k => k + 1); // 같은 페이즈여도 강제 재시작
    onPhaseChange?.(jumpTo.phase);
  }, [jumpTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // 페이즈 재생 완료 → pause 진입 (phaseResetKey 변경 시에도 타이머 재시작)
  useEffect(() => {
    if (isPaused) return;
    const id = setTimeout(() => setIsPaused(true), PHASE_DUR[phase]);
    return () => clearTimeout(id);
  }, [phase, isPaused, phaseResetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // pause 2초 유지 → 다음 페이즈로 전환
  useEffect(() => {
    if (!isPaused) return;
    const id = setTimeout(() => {
      setPhase(p => {
        const next = (p + 1) % 3;
        onPhaseChange?.(next);
        return next;
      });
      setIsPaused(false);
    }, BETWEEN_PAUSE);
    return () => clearTimeout(id);
  }, [isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 0 — morph interval (isPaused 동안 정지, phaseResetKey로 재시작 가능)
  useEffect(() => {
    if (phase !== 0) { setIsPill(false); return; }
    if (isPaused) return;
    const id = setInterval(() => setIsPill(p => !p), 2000);
    return () => clearInterval(id);
  }, [phase, isPaused, phaseResetKey]);

  // Phase 1 — swipe animation loop (3 pairs: 좌→우→좌)
  useEffect(() => {
    if (phase !== 1) { setSwipeDelta(0); return; }
    let cancelled = false;
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const push = (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    const PAIRS: Array<{ current: string; dest: string; dir: -1 | 1 }> = [
      { current: '커뮤니티', dest: '스터디 그룹', dir: -1 },
      { current: '스터디 그룹', dest: '커뮤니티', dir: 1 },
    ];
    let idx = 0;

    function animTo(target: number, dur: number, done: () => void) {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - t0) / dur);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        setSwipeDelta(target * e);
        if (t < 1) raf = requestAnimationFrame(tick);
        else done();
      };
      raf = requestAnimationFrame(tick);
    }

    const MAX_PAIRS = 3; // 3번 재생: 좌→우→좌

    function step() {
      if (cancelled || idx >= MAX_PAIRS) return;
      const pair = PAIRS[idx % 2];
      setSwipeCurrent(pair.current);
      setSwipeDest(pair.dest);
      setSwipeDir(pair.dir);
      setSwipeDelta(0);
      push(() => {
        if (cancelled) return;
        animTo(pair.dir * 96, 650, () => {
          push(() => {
            if (cancelled) return;
            idx++;
            setSwipeCurrent(pair.dest);
            setSwipeDelta(0);
            if (idx < MAX_PAIRS) push(step, 500);
          }, 350);
        });
      }, 500);
    }

    step();
    return () => { cancelled = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, [phase, phaseResetKey]);

  // Phase 2 — context title cycling (속도 1400ms, isPaused 동안 정지)
  useEffect(() => {
    if (phase !== 2) { setTitleIdx(0); return; }
    if (isPaused) return;
    const id = setInterval(() => setTitleIdx(i => (i + 1) % SHOWCASE_CTX_TITLES.length), 1400);
    return () => clearInterval(id);
  }, [phase, isPaused, phaseResetKey]);

  // Swipe math — mirrors Header.tsx constants (MAX_DRAG=96, SNAP_THRESHOLD=72)
  const dragProg = Math.min(1, Math.abs(swipeDelta) / 96);
  const ep = dragProg * dragProg * (3 - 2 * dragProg); // smoothstep
  const isSnapped = Math.abs(swipeDelta) >= 72;
  const isSnapLeft = isSnapped && swipeDelta < 0;
  const isSnapRight = isSnapped && swipeDelta > 0;

  // Center key drives AnimatePresence transitions
  const centerKey = phase === 0 ? (isPill ? 'pill-title' : 'nav') : phase === 1 ? 'swipe' : 'ctx-title';

  // Bottom label
  const bottomLabel = phase === 0
    ? (isPill ? 'Dynamic — 스크롤 후' : 'Default — 최상단')
    : phase === 1
      ? (isSnapped ? swipeDest : swipeCurrent)
      : `${SHOWCASE_CTX_TITLES[titleIdx]} 페이지`;
  const labelKey = phase === 0
    ? (isPill ? 'p0-pill' : 'p0-full')
    : phase === 1
      ? `p1-${isSnapped ? swipeDest : swipeCurrent}`
      : `p2-${titleIdx}`;

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto',
      overflow: 'hidden', borderRadius: 20, padding: '0 0 72px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 160,
    }}>
      {/* Page content skeleton */}
      <div style={{ padding: '72px 28px 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: i === 1 ? 64 : 14, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', marginBottom: 10,
            width: i === 2 ? '65%' : i === 3 ? '42%' : '100%' }} />
        ))}
      </div>

      {/* Morphing header bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <motion.div
          animate={
            phase === 0 && !isPill
              ? { width: '100%' as unknown as number, borderRadius: 0, marginTop: 0 }
              : { width: 248, borderRadius: 50, marginTop: 10 }
          }
          transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
          style={{ overflow: 'hidden', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(245,245,247,0.90)', height: 46, display: 'flex', alignItems: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', padding: '0 20px', gap: 8 }}>
            {/* Logo */}
            <div style={{ width: 56, height: 14, background: '#1D1D1F', borderRadius: 3, opacity: 0.6 }} />

            {/* Center — animated by phase */}
            <div style={{ position: 'relative', minWidth: 0 }}>
              <AnimatePresence mode="wait">

                {/* Phase 0 full: nav links */}
                {centerKey === 'nav' && (
                  <motion.div key="nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                    style={{ display: 'flex', gap: 20 }}>
                    {['스터디룸', '커뮤니티', '그룹', '채팅'].map(l => (
                      <div key={l} style={{ fontSize: 11, color: '#6e6e73', whiteSpace: 'nowrap' }}>{l}</div>
                    ))}
                  </motion.div>
                )}

                {/* Phase 0 pill: static title */}
                {centerKey === 'pill-title' && (
                  <motion.div key="pill-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 500, whiteSpace: 'nowrap' }}>스터디 허브</span>
                  </motion.div>
                )}

                {/* Phase 1: swipe gesture demo */}
                {centerKey === 'swipe' && (
                  <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                    style={{ position: 'relative', width: 114, height: '1.4em', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>

                    {/* ← arrow — glows when right-swipe snaps */}
                    <span style={{
                      position: 'absolute', left: 2, fontSize: 13, fontWeight: 700, color: '#0071E3', zIndex: 2,
                      opacity: swipeDir === 1 ? (isSnapRight ? 0.9 : 0.2) : 0,
                      transition: 'opacity 0.15s',
                    }}>‹</span>

                    {/* Current page title — slides out in swipe direction */}
                    <motion.span
                      animate={{
                        x: Math.sign(swipeDelta) * ep * 52,
                        opacity: isSnapped ? 0 : Math.max(0, 1 - ep * 1.6),
                      }}
                      transition={{ x: { type: 'tween', duration: 0 }, opacity: { duration: 0.06 } }}
                      style={{ position: 'absolute', width: '100%', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                      {swipeCurrent}
                    </motion.span>

                    {/* Destination page title — slides in from the opposite side */}
                    <motion.span
                      animate={{
                        x: swipeDir === -1
                          ? (isSnapLeft ? 0 : swipeDelta < 0 ? (1 - ep) * 56 : 56)
                          : (isSnapRight ? 0 : swipeDelta > 0 ? -(1 - ep) * 56 : -56),
                        opacity: Math.abs(swipeDelta) > 2 ? (isSnapped ? 1 : ep) : 0,
                      }}
                      transition={{
                        x: { type: 'spring', stiffness: isSnapped ? 340 : 280, damping: 28 },
                        opacity: { duration: 0.06 },
                      }}
                      style={{ position: 'absolute', width: '100%', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                      {swipeDest}
                    </motion.span>

                    {/* › arrow — glows when left-swipe snaps */}
                    <span style={{
                      position: 'absolute', right: 2, fontSize: 13, fontWeight: 700, color: '#0071E3', zIndex: 2,
                      opacity: swipeDir === -1 ? (isSnapLeft ? 0.9 : 0.2) : 0,
                      transition: 'opacity 0.15s',
                    }}>›</span>
                  </motion.div>
                )}

                {/* Phase 2: context title cycling */}
                {centerKey === 'ctx-title' && (
                  <motion.div key="ctx-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={SHOWCASE_CTX_TITLES[titleIdx]}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.22 }}
                        style={{ display: 'block', fontSize: 11, color: '#6e6e73', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {SHOWCASE_CTX_TITLES[titleIdx]}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile icon with notification dot */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.25)' }} />
                <div style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: '#ff3b30', border: '1.5px solid rgba(245,245,247,0.9)' }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Phase indicator + label */}
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* 3-dot progress strip */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              animate={{ width: i === phase ? 18 : 6, background: i === phase ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)' }}
              transition={{ duration: 0.3 }}
              style={{ height: 6, borderRadius: 3 }} />
          ))}
        </div>

        {/* 상태 배지 — 현재 브라우저 상태를 직관적으로 표시 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={labelKey}
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            style={{
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 20, padding: '5px 14px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {bottomLabel}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function HeaderAnnotationDiagram() {
  // ── 레이아웃 상수 (viewBox 560 기준) ─────────────────────────────────────────
  const W = 560, BAR_H = 46;
  const CARD_W = 165, CARD_H = 80;   // 카드 크기 (이전 ②③ 카드와 동일 스타일)
  const GAP_H = 12, GAP_V = 28;      // 카드-바 사이 가로·세로 여백

  // 바 위치
  const BAR_W = W - 2 * CARD_W - 2 * GAP_H; // 206px
  const BAR_X = CARD_W + GAP_H;              // 177px
  const BAR_Y = CARD_H + GAP_V;              // 108px
  const H = 2 * CARD_H + 2 * GAP_V + BAR_H; // 262px  (전체 컨테이너 높이)

  // ── 바 내부 요소 정확한 x 좌표 (padding: 0 14px, 내부 요소 실측 기준) ──────
  // 로고 아이콘: padding-left(14) + 아이콘 반폭(6.5) → BAR_X+20.5
  const LOGO_X  = Math.round(BAR_X + 14 + 6.5);  // ≈ 185  로고 아이콘 중심
  // 프로필 원: padding-right(14) + 원 반지름(13) → BAR_X+BAR_W-27
  const PROF_X  = Math.round(BAR_X + BAR_W - 14 - 13); // ≈ 369  프로필 원 중심
  // 네비/스와이프: flex-1 center 구간 중심
  // BAR_X + padding(14) + logo(13+5+28=46) + gap(8) = BAR_X+68 (center start)
  // center end = BAR_X + BAR_W - padding(14) - profile(26) - gap(8) = BAR_X+BAR_W-48
  // center mid = BAR_X + (BAR_W + 20) / 2
  const CTR_X   = Math.round(BAR_X + (BAR_W + 20) / 2);  // ≈ 290
  const NAV_X   = CTR_X - 14; // 네비 링크 — 중심에서 약간 좌
  const SWIPE_X = CTR_X + 14; // 스와이프 화살표 — 중심에서 약간 우

  // ── 화살표 paths (quadratic bezier: M start Q ctrl end) ───────────────────
  // 상단 카드 하단 모서리 → 바 상단 / 하단 카드 상단 모서리 → 바 하단
  // ctrl 포인트: 카드 모서리와 바 목표점의 중간 지점으로 자연스러운 곡선 유도
  const BOT_CARD_Y = H - CARD_H; // 하단 카드 상단 y = 182
  const arrows = [
    // ① 상좌 → 로고 (바 좌측 상단 진입)
    { d: `M ${CARD_W - 8} ${CARD_H - 8} Q ${(CARD_W + LOGO_X) / 2} ${(CARD_H + BAR_Y) / 2} ${LOGO_X} ${BAR_Y + 1}`,  stroke: 'rgba(0,113,227,0.55)'  },
    // ③ 상우 → 프로필 (바 우측 상단 진입)
    { d: `M ${W - CARD_W + 8} ${CARD_H - 8} Q ${(W - CARD_W + PROF_X) / 2} ${(CARD_H + BAR_Y) / 2} ${PROF_X} ${BAR_Y + 1}`,  stroke: 'rgba(255,59,48,0.55)'  },
    // ② 하좌 → 네비 (바 하단 진입)
    { d: `M ${CARD_W - 8} ${BOT_CARD_Y + 8} Q ${(CARD_W + NAV_X) / 2} ${(BOT_CARD_Y + BAR_Y + BAR_H) / 2} ${NAV_X} ${BAR_Y + BAR_H - 1}`,  stroke: 'rgba(99,102,241,0.55)' },
    // ④ 하우 → 스와이프 (바 하단 진입)
    { d: `M ${W - CARD_W + 8} ${BOT_CARD_Y + 8} Q ${(W - CARD_W + SWIPE_X) / 2} ${(BOT_CARD_Y + BAR_Y + BAR_H) / 2} ${SWIPE_X} ${BAR_Y + BAR_H - 1}`,  stroke: 'rgba(52,199,89,0.55)'  },
  ];

  // ── 4개 callout 카드 정의 (상좌-①, 상우-③, 하좌-②, 하우-④) ──────────────
  const CARDS = [
    { num: '①', title: '로고 탭',         desc: '탭하면 최상단으로 스크롤 이동',          color: 'rgba(0,113,227,0.18)',  b: 'rgba(0,113,227,0.3)',   pos: 'top-left'     },
    { num: '③', title: '프로필 아이콘',   desc: '마이페이지 이동 · 알림 배지 표시',        color: 'rgba(255,59,48,0.12)',  b: 'rgba(255,59,48,0.28)',  pos: 'top-right'    },
    { num: '②', title: '네비게이션 링크', desc: '전체 모드에서 주요 페이지로 이동',        color: 'rgba(99,102,241,0.14)', b: 'rgba(99,102,241,0.28)', pos: 'bottom-left'  },
    { num: '④', title: '스와이프 화살표', desc: '필 모드에서 드래그로 페이지 이동',        color: 'rgba(52,199,89,0.12)',  b: 'rgba(52,199,89,0.28)',  pos: 'bottom-right' },
  ];

  const posStyle = (pos: string): React.CSSProperties => ({
    position: 'absolute',
    ...(pos.includes('top')    ? { top: 0 }    : { bottom: 0 }),
    ...(pos.includes('left')   ? { left: 0 }   : { right: 0 }),
    zIndex: 2,
  });

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: W, margin: '88px auto 0',
      paddingTop: 36,
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* 구분 레이블 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.18)' }}>
          헤더 구성 요소
        </span>
      </div>

      {/* ── 다이어그램 컨테이너 ── */}
      <div style={{ position: 'relative', width: '100%', height: H }}>

        {/* SVG 화살표 레이어 */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="hadarr3" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill="rgba(255,255,255,0.32)" />
            </marker>
          </defs>
          {arrows.map(({ d, stroke }, i) => (
            <path key={i} d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#hadarr3)" />
          ))}
        </svg>

        {/* 4개 callout 카드 */}
        {CARDS.map(({ num, title, desc, color, b, pos }) => (
          <div key={num} style={{ ...posStyle(pos), width: CARD_W, padding: '14px 16px', borderRadius: 14, background: color, border: `1px solid ${b}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{num}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{title}</span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
          </div>
        ))}

        {/* 다이나믹 헤더바 — 너비·높이 정중앙 */}
        <div style={{
          position: 'absolute', top: BAR_Y, left: BAR_X, width: BAR_W, height: BAR_H, zIndex: 3,
          background: 'rgba(245,245,247,0.93)', borderRadius: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', boxShadow: '0 4px 28px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.12)', gap: 8,
        }}>
          {/* 로고 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 13, height: 13, borderRadius: 3, background: '#0071E3' }} />
            <div style={{ width: 28, height: 7, borderRadius: 2, background: '#1d1d1f', opacity: 0.45 }} />
          </div>
          {/* 중앙: 스와이프 화살표 + 페이지 타이틀 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: '#0071E3', fontWeight: 700, opacity: 0.5 }}>‹</span>
            <span style={{ fontSize: 10, color: '#1d1d1f', fontWeight: 500 }}>스터디룸</span>
            <span style={{ fontSize: 11, color: '#0071E3', fontWeight: 700, opacity: 0.5 }}>›</span>
          </div>
          {/* 프로필 + 알림 dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.22)' }} />
            </div>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#ff3b30', border: '1.5px solid rgba(245,245,247,0.93)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DynamicHeaderSection() {
  const [activeCard, setActiveCard] = useState(0);
  const [jumpTo, setJumpTo] = useState<{ phase: number; id: number } | null>(null);

  const HEADER_FEATURES = [
    { icon: '↕️', title: '스크롤 반응형 전환', desc: '조금만 스크롤하면 전체 메뉴에서 작고 깔끔한 바로 자연스럽게 바뀝니다' },
    { icon: '👆', title: '스와이프 제스처', desc: '바를 손가락으로 좌우로 밀면 이전·다음 페이지로 이동합니다' },
    { icon: '📍', title: '현재 페이지 표시', desc: '어떤 페이지에 있는지 헤더 중앙에 항상 표시됩니다' },
  ];

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Dynamic Header</SectionLabel>
          <SectionTitle dim="더 깊이 몰입됩니다.">스크롤할수록</SectionTitle>
          <SectionSub>
            페이지 최상단에서는 전체 메뉴가 보이다가, 스크롤하면 작고 섬세한 바로 자연스럽게 변합니다.
            바를 좌우로 밀면 다른 페이지로도 이동할 수 있습니다.
          </SectionSub>
        </motion.div>

        {/* 기능 카드 — 클릭 시 즉시 해당 애니메이션으로 이동 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
          {HEADER_FEATURES.map(({ icon, title, desc }, i) => (
            <motion.div
              key={title}
              onClick={() => {
                setActiveCard(i);
                setJumpTo({ phase: i, id: Date.now() });
              }}
              animate={{ background: activeCard === i ? 'rgba(0,113,227,0.15)' : 'rgba(255,255,255,0.03)', borderColor: activeCard === i ? 'rgba(0,113,227,0.4)' : 'rgba(255,255,255,0.06)' }}
              transition={{ duration: 0.4 }}
              style={{ borderRadius: 16, border: '1px solid', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <motion.div animate={{ color: activeCard === i ? '#fff' : 'rgba(255,255,255,0.55)' }} transition={{ duration: 0.3 }} style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{title}</motion.div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', lineHeight: 1.55 }}>{desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Fixed-area header showcase */}
        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
          <HeaderShowcase onPhaseChange={setActiveCard} jumpTo={jumpTo} />
        </motion.div>

        {/* Static annotation diagram */}
        <motion.div {...fadeUp} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
          <HeaderAnnotationDiagram />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────

export default function Home() {
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(-1);
  const navigate = useNavigate();

  const { scrollY } = useScroll();
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const bgColor = useTransform(scrollY, [vh * 0.4, vh * 1.05], ['#f5f5f7', '#050507']);

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

  const Badge = ({ label, bg, border, dot }: { label: string; bg: string; border: string; dot: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: bg, border: `1px solid ${border}`, flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );

  return (
    <>
      {/* Fixed background */}
      <motion.div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: bgColor }} />

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <StudyHubLogo size={320} variant="hero" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 16, fontSize: 15, fontWeight: 300, color: '#6e6e73', letterSpacing: '-0.01em' }}
        >
          공부하는 모든 순간을, 더 스마트하게.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 36, display: 'flex', gap: 12 }}
        >
          <motion.button
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="liquid liquid-action"
            style={{ borderRadius: 9999, padding: '11px 32px', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            시작하기
          </motion.button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          style={{ position: 'absolute', bottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aeaeb2' }}>Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 1, height: 28, background: 'linear-gradient(to bottom, #aeaeb2, transparent)' }} />
        </motion.div>
      </section>

      {/* ═══════════ 2. GSAP STICKY SCENES ═══════════ */}
      <div ref={scrollWrapRef} style={{ height: '550vh' }}>
        <div ref={stickyRef} className="relative flex h-screen w-full items-center justify-center overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(0,113,227,0.14) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 z-10 pointer-events-none">
            {SCENES.map((scene, i) => (
              <SceneText key={scene.label} {...scene} visible={activeScene === i} />
            ))}
          </div>
          <AnimatePresence>
            {activeScene === -1 && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-semibold tracking-[0.4em] uppercase select-none" style={{ color: 'rgba(255,255,255,0.1)', zIndex: 10 }}>
                스터디 허브
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════ 3. MARQUEE ═══════════ */}
      <section style={{ padding: '0 0 0', backgroundColor: 'transparent', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '48px 0' }}>
          <Marquee duration={38}>
            {BADGES_ROW1.map(b => <Badge key={b.label} {...b} />)}
          </Marquee>
          <Marquee duration={44} reverse>
            {BADGES_ROW2.map(b => <Badge key={b.label} {...b} />)}
          </Marquee>
        </div>
      </section>

      {/* ═══════════ 4. WHY STUDYHUB ═══════════ */}
      <WhySection />

      {/* ═══════════ 5. CORE FEATURES CAROUSEL ═══════════ */}
      <section style={{ backgroundColor: 'transparent', paddingTop: 60, paddingBottom: 80 }}>
        <motion.div {...fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel>Core Features</SectionLabel>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold text-white" style={{ letterSpacing: '-0.03em' }}>
            스터디 허브의<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>모든 것.</span>
          </h2>
        </motion.div>
        <CardCarousel cards={DEFAULT_CAROUSEL_CARDS} />
      </section>

      {/* ═══════════ 6. DYNAMIC HEADER ═══════════ */}
      <DynamicHeaderSection />

      {/* ═══════════ 7. ROOM BOOKING ═══════════ */}
      <RoomBookingShowcase />

      {/* ═══════════ 8. STUDY GROUPS ═══════════ */}
      <GroupPipelineShowcase />

      {/* ═══════════ 9. COMMUNITY ═══════════ */}
      <CommunityShowcase />

      {/* ═══════════ 10. REAL-TIME CHAT ═══════════ */}
      <ChatShowcase />

      {/* ═══════════ 11. LIQUID GLASS UI ═══════════ */}
      <LiquidGlassShowcase />

      {/* ═══════════ 12. BLOCK EDITOR ═══════════ */}
      <BlockEditorShowcase />

      {/* ═══════════ 13. NOTIFICATIONS ═══════════ */}
      <NotificationsShowcase />

      {/* ═══════════ 14. MYPAGE ═══════════ */}
      <MyPageShowcase />

      {/* ═══════════ 15. CTA OUTRO ═══════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center" style={{ backgroundColor: 'transparent' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,113,227,0.4) 40%, rgba(251,191,36,0.4) 60%, transparent)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 38% at 50% 55%, rgba(0,113,227,0.12) 0%, transparent 70%)' }} />

        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 flex flex-col items-center">
          <span className="mb-6 text-[10px] font-semibold tracking-[0.35em] uppercase text-[#0071E3]">지금 시작하세요</span>
          <h2 className="max-w-2xl text-4xl md:text-6xl font-semibold leading-tight text-white" style={{ letterSpacing: '-0.04em' }}>
            당신의 스터디,
            <br />
            <span className="bg-linear-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              더 스마트하게.
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-white/38">
            팀을 꾸리고, 공간을 예약하고, 지식을 나누세요.
            <br />
            스터디 허브 하나로 모든 게 연결됩니다.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 32, marginBottom: 40, maxWidth: 560 }}>
            {['📅 스터디룸 예약', '👥 그룹 형성', '💬 실시간 채팅', '📝 커뮤니티', '🪟 Liquid Glass UI'].map(t => (
              <div key={t} style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{t}</div>
            ))}
          </div>

          <motion.button
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="liquid liquid-action"
            style={{ borderRadius: 9999, padding: '11px 32px', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            시작하기
          </motion.button>
        </motion.div>

        <p className="absolute bottom-8 text-[11px] font-light text-white/18">
          © 2026 멋쟁이사자처럼 14기 StudyHub. All rights reserved.
        </p>
      </section>
    </>
  );
}
