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

const NAV_LINKS = [
  { label: '스터디룸', href: '/rooms' },
  { label: '커뮤니티', href: '/community' },
  { label: '스터디 그룹', href: '/groups' },
  { label: '채팅', href: '/chats' },
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

const SWIPE_THRESHOLD = 48  // px — 이 이상 드래그해야 라우팅 실행

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
  const touchStartX = useRef<number | null>(null)
  const { isLoggedIn, user, logout } = useAuth()
  const { unreadCount } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // ── Pill 모드 스와이프 핸들러 ────────────────────────────────────────────────
  const swipeRoutes = getSwipeRoutes(location.pathname)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    setSwipeDeltaX(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    // 화살표 힌트가 존재하는 방향으로만 시각 피드백 제공
    if ((delta > 0 && swipeRoutes.swipeRight) || (delta < 0 && swipeRoutes.swipeLeft)) {
      setSwipeDeltaX(Math.max(-32, Math.min(32, delta)))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    setSwipeDeltaX(0)

    if (delta > SWIPE_THRESHOLD && swipeRoutes.swipeRight) {
      navigate(swipeRoutes.swipeRight)
    } else if (delta < -SWIPE_THRESHOLD && swipeRoutes.swipeLeft) {
      navigate(swipeRoutes.swipeLeft)
    }
  }

  const title = pageTitle(location.pathname)

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
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: swipeDeltaX * 0.18,
                    }}
                    transition={{
                      opacity: { delay: 0.15, duration: 0.3 },
                      y:       { delay: 0.15, duration: 0.3 },
                      x:       { type: 'tween', duration: swipeDeltaX === 0 ? 0.22 : 0 },
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="text-xs font-medium flex-1 select-none"
                    style={{
                      color: '#6e6e73',
                      letterSpacing: '-0.01em',
                      cursor: (swipeRoutes.swipeLeft || swipeRoutes.swipeRight) ? 'grab' : 'default',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}>
                    {/* 왼쪽 화살표 힌트 (swipeRight 라우트 존재 시) */}
                    {swipeRoutes.swipeRight && (
                      <svg width={8} height={8} viewBox="0 0 8 8" fill="none"
                        style={{
                          opacity: swipeDeltaX > 8 ? 0.75 : 0.2,
                          flexShrink: 0,
                          transition: 'opacity 0.1s',
                        }}>
                        <path d="M5 1L2 4l3 3" stroke="#6e6e73" strokeWidth={1.5}
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {title}
                    {/* 오른쪽 화살표 힌트 (swipeLeft 라우트 존재 시) */}
                    {swipeRoutes.swipeLeft && (
                      <svg width={8} height={8} viewBox="0 0 8 8" fill="none"
                        style={{
                          opacity: swipeDeltaX < -8 ? 0.75 : 0.2,
                          flexShrink: 0,
                          transition: 'opacity 0.1s',
                        }}>
                        <path d="M3 1l3 3-3 3" stroke="#6e6e73" strokeWidth={1.5}
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </motion.span>

                  {/* 유저 아이콘 */}
                  <motion.button
                    onClick={() => navigate(isLoggedIn ? '/my' : '/auth')}
                    whileTap={{ scale: 0.88 }}
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
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
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                height: 52,
                paddingLeft: 48,
                paddingRight: 48,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}>
                {/* 로고 */}
                <Link to="/" aria-label="StudyHub 홈"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  <img src="/logo-white.png" alt="StudyHub" height={26}
                    style={{ height: 26, width: 'auto', filter: 'invert(1) brightness(0)' }} />
                </Link>

                {/* 중앙 nav */}
                <nav className="hidden md:flex items-center" style={{ gap: 32 }}>
                  {NAV_LINKS.map((link) => {
                    const active = location.pathname.startsWith(link.href)
                    return (
                      <Link key={link.label} to={link.href}
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: active ? '#1d1d1f' : '#6e6e73',
                          textDecoration: 'none',
                          transition: 'color 0.2s',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.01em',
                        }}
                        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#1d1d1f')}
                        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = active ? '#1d1d1f' : '#6e6e73')}
                      >
                        {link.label}
                      </Link>
                    )
                  })}
                </nav>

                {/* 우측 액션 */}
                <div className="flex items-center" style={{ gap: 12, justifyContent: 'flex-end' }}>
                  {isLoggedIn ? (
                    <>
                      {/* 알림 */}
                      <motion.button
                        onClick={() => navigate('/notifications')}
                        whileTap={{ scale: 0.9 }}
                        title="알림"
                        style={{
                          position: 'relative',
                          width: 30, height: 30,
                          borderRadius: '50%',
                          background: 'transparent',
                          border: '1px solid rgba(0,0,0,0.12)',
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
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: '#1d1d1f',
                          background: 'transparent',
                          border: '1px solid rgba(0,0,0,0.18)',
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
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#fff',
                          background: '#1d1d1f',
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
