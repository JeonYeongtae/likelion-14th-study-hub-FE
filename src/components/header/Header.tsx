/**
 * Header — Apple GNB style (White Tone)
 *
 * Full-width: 흰 반투명 배경 | 다크 텍스트 | 로고 | 중앙 nav | 우측 액션
 * Pill (스크롤 80px+): 흰 글래스 필 | 로고 | 페이지명 | 유저 아이콘
 *
 * Pill 모드 제스처:
 *   - 타이틀 영역 좌→우 스와이프: swipeRight 라우트로 이동 (상위/이전 페이지)
 *   - 타이틀 영역 우→좌 스와이프: swipeLeft 라우트로 이동 (형제 섹션)
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import LiquidShaderBase from '../liquid-glass/LiquidShaderBase'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { useAlert } from '../../contexts/AlertContext'

const NAV_LINKS = [
  { label: '스터디룸', href: '/rooms', authRequired: false },
  { label: '커뮤니티', href: '/community', authRequired: false },
  { label: '스터디 그룹', href: '/groups', authRequired: false },
  { label: '채팅', href: '/chats', authRequired: true },
]

const PATH_TITLES: Record<string, string> = {
  '/':              '홈',
  '/rooms':         '스터디룸',
  '/community':     '커뮤니티',
  '/groups':        '스터디 그룹',
  '/chats':         '채팅',
  '/my':            '마이페이지',
  '/notifications': '알림',
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/community/')) return '게시글'
  if (pathname.startsWith('/rooms/'))     return '스터디룸 예약'
  if (pathname.startsWith('/groups/') && pathname.endsWith('/chat')) return '채팅방'
  if (pathname.startsWith('/groups/'))    return '그룹 상세'
  return PATH_TITLES[pathname] ?? 'Study Hub'
}

/**
 * Pill 모드 스와이프 라우팅 맵
 * swipeRight: 손가락을 오른쪽으로 → 상위/이전 페이지
 * swipeLeft:  손가락을 왼쪽으로  → 다음 섹션 페이지
 *
 * NAV 순서: 스터디룸 ↔ 커뮤니티 ↔ 스터디 그룹
 */
function getSwipeRoutes(pathname: string): { swipeLeft?: string; swipeRight?: string } {
  if (pathname === '/rooms')     return { swipeLeft: '/community' }
  if (pathname === '/community') return { swipeLeft: '/groups', swipeRight: '/rooms' }
  if (pathname === '/groups')    return { swipeLeft: '/chats', swipeRight: '/community' }
  if (pathname === '/chats')     return { swipeRight: '/groups' }
  // 상세 페이지 → 오른쪽 스와이프로 목록으로 복귀
  if (pathname.startsWith('/community/')) return { swipeRight: '/community' }
  if (pathname.startsWith('/rooms/'))     return { swipeRight: '/rooms' }
  if (pathname.startsWith('/groups/'))    return { swipeRight: '/groups' }
  return {}
}

const SWIPE_THRESHOLD = 96  // px — 이 이상 드래그해야 라우팅 실행
const MAX_DRAG        = 96  // px — swipeDeltaX 상한 (= 시각 완료 거리)
const SNAP_THRESHOLD  = 72  // px — 이 지점부터 목적지가 스냅(= threshold의 75%)

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15}
      fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.87 3.58-7 8-7s8 3.13 8 7" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15}
      fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [swipeDeltaX, setSwipeDeltaX] = useState(0)  // 드래그 중 시각 피드백용
  const [isNarrow, setIsNarrow] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dragStartX = useRef<number | null>(null)
  const isDragging = useRef(false)
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { isLoggedIn, user, logout } = useAuth()
  const { unreadCount } = useNotification()
  const { showConfirm } = useAlert()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 620)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const openMenu = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current)
    setMenuOpen(true)
  }
  const closeMenu = () => {
    menuCloseTimer.current = setTimeout(() => setMenuOpen(false), 150)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // ── Pill 모드 스와이프 핸들러 (터치 + 마우스 드래그 통합) ────────────────────
  const swipeRoutes = getSwipeRoutes(location.pathname)

  // ── 공통 시작/이동/종료 로직 ─────────────────────────────────────────────────
  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX
    isDragging.current = true
    setSwipeDeltaX(0)
  }

  const handleDragMove = (clientX: number) => {
    if (dragStartX.current === null || !isDragging.current) return
    const delta = clientX - dragStartX.current
    if ((delta > 0 && swipeRoutes.swipeRight) || (delta < 0 && swipeRoutes.swipeLeft)) {
      setSwipeDeltaX(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, delta)))
    }
  }

  const handleDragEnd = (clientX: number) => {
    if (dragStartX.current === null || !isDragging.current) return
    const delta = clientX - dragStartX.current
    dragStartX.current = null
    isDragging.current = false
    setSwipeDeltaX(0)

    const tryNavigate = async (route: string) => {
      // 상세 페이지 → 목록 페이지(부모) 이동: 브라우저 back으로 URL 파라미터 보존
      if (location.pathname.startsWith(route + '/')) {
        navigate(-1)
        return
      }
      const targetLink = NAV_LINKS.find(l => l.href === route)
      if (targetLink?.authRequired && !isLoggedIn) {
        if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
        navigate('/auth')
      } else {
        navigate(route)
      }
    }

    if (delta > SWIPE_THRESHOLD && swipeRoutes.swipeRight) {
      tryNavigate(swipeRoutes.swipeRight)
    } else if (delta < -SWIPE_THRESHOLD && swipeRoutes.swipeLeft) {
      tryNavigate(swipeRoutes.swipeLeft)
    }
  }

  // ── 터치 이벤트 ──────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX)
  const handleTouchMove  = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX)
  const handleTouchEnd   = (e: React.TouchEvent) => handleDragEnd(e.changedTouches[0].clientX)

  // ── 마우스 이벤트 ────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)

    // 마우스가 타이틀 밖으로 나가도 드래그 추적을 유지하기 위해 window에 등록
    const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX)
    const onMouseUp   = (ev: MouseEvent) => {
      handleDragEnd(ev.clientX)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  const title = pageTitle(location.pathname)
  // 알림 등 다른 페이지에서 넘어온 경우, swipeRight가 뒤로가기 동작이므로 출처 페이지명 표시
  const fromPath: string | undefined = (location.state as { from?: string } | null)?.from
  const swipeRightLabel = fromPath ? pageTitle(fromPath) : (swipeRoutes.swipeRight ? pageTitle(swipeRoutes.swipeRight) : '')
  // 0 ~ 1: 드래그가 최대 시각 범위(MAX_DRAG)에 얼마나 도달했는지
  const dragProgress = Math.min(1, Math.abs(swipeDeltaX) / MAX_DRAG)
  // smoothstep(3t²-2t³): 정방향·역방향 모두 양 끝에서 완만, 중간에서 가속
  const easedProgress = dragProgress * dragProgress * (3 - 2 * dragProgress)
  // 현재 드래그 방향에 유효한 라우트가 있는지
  const hasActiveDest =
    (swipeDeltaX > 0 && !!swipeRoutes.swipeRight) ||
    (swipeDeltaX < 0 && !!swipeRoutes.swipeLeft)
  // 스냅 임계점 돌파 여부 — 목적지가 중앙에 자석처럼 고정되는 시점
  const isSnapped = Math.abs(swipeDeltaX) >= SNAP_THRESHOLD && hasActiveDest
  // 방향별 스냅 여부
  const isSnapRight = isSnapped && swipeDeltaX > 0
  const isSnapLeft  = isSnapped && swipeDeltaX < 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center"
      style={{ pointerEvents: 'none' }}>
      <motion.div
        style={{ pointerEvents: 'auto' }}
        animate={
          isScrolled
            ? { width: 320, marginTop: 12, borderRadius: 50 }
            : { width: '100%' as unknown as number, marginTop: 0, borderRadius: 0 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className="overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isScrolled ? (
            /* ── PILL MODE ──────────────────────────────────────────────── */
            <motion.div key="pill"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <LiquidShaderBase width={320} height={46} borderRadius={50}
                tint="rgba(245, 245, 247, 0.72)">
                <div className="flex items-center justify-between"
                  style={{ height: 46, paddingLeft: 20, paddingRight: 20, gap: 16 }}>
                  {/* 로고 */}
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    aria-label="StudyHub 홈">
                    <img src="/logo-white.png" alt="StudyHub" height={24}
                      style={{ height: 24, width: 'auto', filter: 'invert(1) brightness(0)' }} />
                  </button>

                  {/* 페이지 타이틀 — 스와이프 제스처 영역
                      ※ motion.span에 style.transform을 쓰면 framer-motion이
                         animate={{ y }}를 직렬화할 때 덮어쓰므로, x 이동도
                         animate 프롭으로 전달한다. touchAction: 'none'으로
                         브라우저가 수평 터치를 가로채지 않도록 한다. */}
                  {/* 제스처 영역 — 화살표는 absolute, 타이틀이 전체 너비 점유 */}
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0, x: swipeDeltaX * 0.22 }}
                    transition={{
                      opacity: { delay: 0.15, duration: 0.3 },
                      y:       { delay: 0.15, duration: 0.3 },
                      x:       { type: 'tween', duration: swipeDeltaX === 0 ? 0.22 : 0 },
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    className="text-xs font-medium flex-1 select-none"
                    style={{
                      position: 'relative',
                      color: '#6e6e73',
                      letterSpacing: '-0.01em',
                      cursor: isDragging.current
                        ? 'grabbing'
                        : (swipeRoutes.swipeLeft || swipeRoutes.swipeRight)
                          ? 'grab'
                          : 'default',
                      touchAction: 'none',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}>

                    {/* ← 왼쪽 화살표 — 스냅 시에만 활성화
                        왼쪽 드래그(비활성) 시 부모 span의 x 이동을 상쇄해 로고 영역 침범 방지 */}
                    {swipeRoutes.swipeRight && (
                      <motion.svg
                        width={9} height={9} viewBox="0 0 8 8" fill="none"
                        style={{ position: 'absolute', left: 0, zIndex: 1, pointerEvents: 'none' }}
                        animate={{
                          opacity: isSnapped && swipeDeltaX > 0 ? 0.85 : 0.18,
                          scale:   isSnapped && swipeDeltaX > 0 ? 1.4 : 1,
                          x: swipeDeltaX < 0 ? -swipeDeltaX * 0.2 : 0,
                        }}
                        transition={{
                          opacity: { type: 'spring', stiffness: 650, damping: 12, mass: 0.5 },
                          scale:   { type: 'spring', stiffness: 650, damping: 12, mass: 0.5 },
                          x:       { duration: 0 },
                        }}>
                        <path d="M5 1L2 4l3 3" stroke="#6e6e73" strokeWidth={1.5}
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    )}

                    {/* 타이틀 컨테이너 — 전체 너비, 텍스트는 안에서 슬라이드 */}
                    <div style={{
                      width: '100%',
                      position: 'relative',
                      height: '1.4em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {/* 현재 페이지명 — 스프링으로 쫀득하게 드래그 방향으로 밀리다 스냅 시 페이드아웃 */}
                      <motion.span
                        animate={{
                          x: Math.sign(swipeDeltaX) * easedProgress * 200,
                          opacity: isSnapped ? 0 : Math.max(0, 1 - easedProgress * 1.6),
                        }}
                        transition={{
                          x: isSnapped
                            ? { type: 'spring', stiffness: 340, damping: 28 }
                            : { type: 'spring', stiffness: 80, damping: 22 },
                          opacity: { type: 'tween', duration: isSnapped ? 0.12 : 0.06 },
                        }}
                        style={{ position: 'absolute', whiteSpace: 'nowrap' }}>
                        {title}
                      </motion.span>

                      {/* 오른쪽 드래그 목적지 — 항상 왼쪽(-200)에 대기, 중앙으로만 이동
                          방향이 고정되어 있어 반대편을 가로지르는 글리치가 발생하지 않음 */}
                      {swipeRoutes.swipeRight && (
                        <motion.span
                          animate={{
                            x: isSnapRight
                              ? 0
                              : swipeDeltaX > 0
                                ? -(1 - easedProgress) * 200
                                : -200,
                            opacity: swipeDeltaX > 0 ? (isSnapRight ? 1 : easedProgress) : 0,
                          }}
                          transition={{
                            x: isSnapRight
                              ? { type: 'spring', stiffness: 340, damping: 28 }
                              : { type: 'spring', stiffness: 280, damping: 32 },
                            opacity: { type: 'tween', duration: 0.06 },
                          }}
                          style={{ position: 'absolute', whiteSpace: 'nowrap', color: '#1d1d1f', fontWeight: 500 }}>
                          {swipeRightLabel}
                        </motion.span>
                      )}

                      {/* 왼쪽 드래그 목적지 — 항상 오른쪽(+200)에 대기, 중앙으로만 이동 */}
                      {swipeRoutes.swipeLeft && (
                        <motion.span
                          animate={{
                            x: isSnapLeft
                              ? 0
                              : swipeDeltaX < 0
                                ? (1 - easedProgress) * 200
                                : 200,
                            opacity: swipeDeltaX < 0 ? (isSnapLeft ? 1 : easedProgress) : 0,
                          }}
                          transition={{
                            x: isSnapLeft
                              ? { type: 'spring', stiffness: 340, damping: 28 }
                              : { type: 'spring', stiffness: 280, damping: 32 },
                            opacity: { type: 'tween', duration: 0.06 },
                          }}
                          style={{ position: 'absolute', whiteSpace: 'nowrap', color: '#1d1d1f', fontWeight: 500 }}>
                          {pageTitle(swipeRoutes.swipeLeft)}
                        </motion.span>
                      )}
                    </div>

                    {/* → 오른쪽 화살표 — 스냅 시에만 활성화
                        오른쪽 드래그(비활성) 시 부모 span의 x 이동을 상쇄해 프로필 영역 침범 방지 */}
                    {swipeRoutes.swipeLeft && (
                      <motion.svg
                        width={9} height={9} viewBox="0 0 8 8" fill="none"
                        style={{ position: 'absolute', right: 0, zIndex: 1, pointerEvents: 'none' }}
                        animate={{
                          opacity: isSnapped && swipeDeltaX < 0 ? 0.85 : 0.18,
                          scale:   isSnapped && swipeDeltaX < 0 ? 1.4 : 1,
                          x: swipeDeltaX > 0 ? -swipeDeltaX * 0.2 : 0,
                        }}
                        transition={{
                          opacity: { type: 'spring', stiffness: 650, damping: 12, mass: 0.5 },
                          scale:   { type: 'spring', stiffness: 650, damping: 12, mass: 0.5 },
                          x:       { duration: 0 },
                        }}>
                        <path d="M3 1l3 3-3 3" stroke="#6e6e73" strokeWidth={1.5}
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </motion.svg>
                    )}

                  </motion.span>

                  {/* 유저 아이콘 */}
                  <motion.button
                    onClick={async () => {
                      if (isLoggedIn) {
                        navigate('/my')
                      } else {
                        if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
                        navigate('/auth')
                      }
                    }}
                    whileTap={{ scale: 0.88 }}
                    className="shrink-0 flex items-center justify-center rounded-full"
                    style={{ position: 'relative', width: 28, height: 28, background: 'rgba(0,0,0,0.06)', color: '#1d1d1f' }}
                    aria-label="마이페이지">
                    <UserIcon />
                    {isLoggedIn && unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: -2, right: -2,
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: '#ff3b30',
                        border: '1.5px solid rgba(245,245,247,0.72)',
                      }} />
                    )}
                  </motion.button>
                </div>
              </LiquidShaderBase>
            </motion.div>
          ) : (
            /* ── FULL-WIDTH MODE ─────────────────────────────────────────── */
            <motion.div key="full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <div style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                height: 52,
                maxWidth: 1080,
                margin: '0 auto',
                paddingLeft: 32,
                paddingRight: 32,
              }}>
                {/* 로고 */}
                <Link to="/" aria-label="StudyHub 홈"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  <img src="/logo-white.png" alt="StudyHub" height={26}
                    style={{ height: 26, width: 'auto', filter: 'invert(1) brightness(0)' }} />
                </Link>

                {/* 중앙 nav */}
                {!isNarrow ? (
                  <nav className="flex items-center" style={{ gap: 32 }}>
                    {NAV_LINKS.map((link) => {
                      const active = location.pathname.startsWith(link.href)
                      const linkStyle = {
                        fontSize: 13,
                        fontWeight: 400,
                        color: active ? '#1d1d1f' : '#6e6e73',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        whiteSpace: 'nowrap' as const,
                        letterSpacing: '-0.01em',
                      }
                      if (link.authRequired && !isLoggedIn) {
                        return (
                          <button key={link.label}
                            onClick={async () => {
                              if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
                              navigate('/auth')
                            }}
                            style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = active ? '#1d1d1f' : '#6e6e73')}
                          >
                            {link.label}
                          </button>
                        )
                      }
                      return (
                        <Link key={link.label} to={link.href}
                          style={linkStyle}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = active ? '#1d1d1f' : '#6e6e73')}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </nav>
                ) : (
                  <div
                    onMouseEnter={openMenu}
                    onMouseLeave={closeMenu}
                    style={{ display: 'flex', justifyContent: 'center' }}>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#6e6e73', padding: '4px 12px',
                      borderRadius: 999, fontFamily: 'inherit', letterSpacing: '-0.01em',
                    }}>
                      카테고리
                      <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}

                {/* 우측 액션 */}
                <div className="flex items-center" style={{ gap: 12, justifyContent: 'flex-end' }}>
                  {isLoggedIn ? (
                    <>
                      {/* 알림 */}
                      <motion.button
                        onClick={() => navigate('/notifications')}
                        whileTap={{ scale: 0.9 }}
                        title="알림"
                        className="liquid"
                        style={{
                          position: 'relative',
                          width: 30, height: 30,
                          borderRadius: '50%',
                          border: 'none',
                          color: '#1d1d1f',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'visible',
                        }}>
                        <BellIcon />
                        {unreadCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: -3, right: -3,
                            width: 8, height: 8,
                            borderRadius: '50%',
                            background: '#ff3b30',
                            border: '1.5px solid #fff',
                          }} />
                        )}
                      </motion.button>

                      {/* 닉네임 */}
                      <button
                        onClick={() => navigate('/my')}
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: '#1d1d1f',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          letterSpacing: '-0.01em',
                        }}>
                        {user?.nickname}
                      </button>

                      {/* 로그아웃 */}
                      <motion.button
                        onClick={handleLogout}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className="liquid"
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: '#1d1d1f',
                          border: 'none',
                          borderRadius: 999,
                          padding: '6px 16px',
                          cursor: 'pointer',
                          letterSpacing: '-0.01em',
                        }}>
                        로그아웃
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/auth')}
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: '#6e6e73',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'color 0.2s',
                          letterSpacing: '-0.01em',
                        }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#6e6e73')}>
                        로그인
                      </button>
                      <motion.button
                        onClick={() => navigate('/auth', { state: { step: 'signup' } })}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className="liquid liquid-action"
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          border: 'none',
                          borderRadius: 999,
                          padding: '7px 16px',
                          cursor: 'pointer',
                          letterSpacing: '-0.01em',
                        }}>
                        시작하기
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* 좁은 화면에서 호버 시 확장되는 nav 패널 */}
              <AnimatePresence>
                {isNarrow && menuOpen && (
                  <motion.nav
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 44, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onMouseEnter={openMenu}
                    onMouseLeave={closeMenu}
                    style={{
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 28,
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      paddingLeft: 32,
                      paddingRight: 32,
                    }}>
                    {NAV_LINKS.map((link) => {
                      const active = location.pathname.startsWith(link.href)
                      const linkStyle = {
                        fontSize: 13,
                        fontWeight: 400,
                        color: active ? '#1d1d1f' : '#6e6e73',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        whiteSpace: 'nowrap' as const,
                        letterSpacing: '-0.01em',
                      }
                      if (link.authRequired && !isLoggedIn) {
                        return (
                          <button key={link.label}
                            onClick={async () => {
                              setMenuOpen(false)
                              if (!(await showConfirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?'))) return
                              navigate('/auth')
                            }}
                            style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = active ? '#1d1d1f' : '#6e6e73')}
                          >
                            {link.label}
                          </button>
                        )
                      }
                      return (
                        <Link key={link.label} to={link.href}
                          onClick={() => setMenuOpen(false)}
                          style={linkStyle}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = active ? '#1d1d1f' : '#6e6e73')}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </motion.nav>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
