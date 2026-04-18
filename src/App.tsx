import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LiquidSvgFilters from './components/svg-filters/LiquidSvgFilters'
import Header from './components/header/Header'
import AlertBanner from './components/AlertBanner'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
import { NotificationProvider } from './contexts/NotificationContext'

// ─── Pages (lazy) ─────────────────────────────────────────────────────────────
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
const DesignTest      = lazy(() => import('./pages/DesignTest'))
const CommunityPage   = lazy(() => import('./pages/CommunityPage'))
const PostDetailPage  = lazy(() => import('./pages/PostDetailPage'))
const RoomsPage       = lazy(() => import('./pages/RoomsPage'))
const RoomDetailPage  = lazy(() => import('./pages/RoomDetailPage'))
const GroupsPage      = lazy(() => import('./pages/GroupsPage'))
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage'))
const GroupChatPage   = lazy(() => import('./pages/GroupChatPage'))
const ChatListPage    = lazy(() => import('./pages/ChatListPage'))
const MyPage              = lazy(() => import('./pages/MyPage'))
const NotificationsPage   = lazy(() => import('./pages/NotificationsPage'))

// ─── 로딩 폴백 ───────────────────────────────────────────────────────────────

function PageFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '2px solid #e5e5ea',
        borderTopColor: '#E07535',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── 라우트 가드 ──────────────────────────────────────────────────────────────

/**
 * 로그인 필수 — 비로그인 시 /auth 로 리다이렉트
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <PageFallback />
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  return <>{children}</>
}

/**
 * 비로그인 전용 — 로그인 상태면 /community 로 리다이렉트
 * (랜딩 페이지·로그인 페이지)
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <PageFallback />
  if (isLoggedIn) return <Navigate to="/community" replace />
  return <>{children}</>
}

// ─── Header 표시 여부 ─────────────────────────────────────────────────────────

function AppShell() {
  const location = useLocation()
  const hideHeader = location.pathname === '/auth' || /^\/groups\/\d+\/chat$/.test(location.pathname)

  return (
    <>
      <LiquidSvgFilters />
      {!hideHeader && <Header />}
      <AlertBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* 비로그인 전용 */}
          <Route path="/"     element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
          <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />

          {/* 로그인 필수 */}
          <Route path="/my"            element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* 공개 (로그인 여부 무관, UI만 분기) */}
          <Route path="/community"     element={<CommunityPage />} />
          <Route path="/community/:id" element={<PostDetailPage />} />
          <Route path="/rooms"         element={<RoomsPage />} />
          <Route path="/rooms/:id"     element={<RoomDetailPage />} />
          <Route path="/groups"        element={<GroupsPage />} />
          <Route path="/groups/:id"    element={<GroupDetailPage />} />
          <Route path="/groups/:id/chat" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
          <Route path="/chats"         element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />

          <Route path="/design-test"   element={<DesignTest />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AlertProvider>
            <AppShell />
          </AlertProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
