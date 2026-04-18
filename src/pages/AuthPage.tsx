/**
 * AuthPage.tsx
 *
 * Apple 계정 로그인 페이지 스타일
 * - 상단 로고 (작게 축소된 StudyHubLogo)
 * - 타이틀 + 서브타이틀
 * - 이메일 입력 → 계속하기 → 비밀번호 단계
 * - 회원가입 전환
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import StudyHubLogo from '../components/StudyHubLogo'
import { useAuth } from '../contexts/AuthContext'

// ─── 단계 타입 ────────────────────────────────────────────────────────────────

type Step = 'email' | 'password' | 'signup' | 'reactivate'

// ─── FloatingInput ────────────────────────────────────────────────────────────

function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '22px 14px 8px',
          fontSize: 16,
          color: '#1D1D1F',
          background: '#fff',
          border: `1.5px solid ${focused ? '#0071e3' : '#d2d2d7'}`,
          borderRadius: 12,
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(0,113,227,0.15)' : 'none',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          fontFamily: 'inherit',
          letterSpacing: '-0.01em',
        }}
      />
      <motion.label
        animate={
          floated
            ? { top: 8, fontSize: 11, color: focused ? '#0071e3' : '#6e6e73' }
            : { top: 17, fontSize: 16, color: '#6e6e73' }
        }
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          left: 14,
          pointerEvents: 'none',
          fontWeight: 400,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {label}
      </motion.label>
    </div>
  )
}

// ─── 메인 버튼 ────────────────────────────────────────────────────────────────

function PrimaryBtn({
  children,
  onClick,
  disabled,
  loading,
  type = 'submit',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'submit' | 'button'
}) {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <motion.button
        type={type}
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.015 }}
        whileTap={{ scale: disabled ? 1 : 0.975 }}
        style={{
          width: '100%',
          borderRadius: 12,
          padding: '14px 0',
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          background: disabled ? '#a1c4f0' : '#0071e3',
          color: '#fff',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading && (
          <span style={{
            display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
        )}
        {children}
      </motion.button>
    </>
  )
}

// ─── 단계별 폼 ────────────────────────────────────────────────────────────────

function EmailStep({ onNext, initialEmail = '' }: { onNext: (email: string) => void; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (email.trim()) onNext(email.trim()) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <FloatingInput
        label="이메일"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        autoFocus
      />
      <PrimaryBtn disabled={!email.trim()}>계속하기</PrimaryBtn>
    </form>
  )
}

function PasswordStep({
  email,
  onSuccess,
  onBack,
  onDeactivated,
}: {
  email: string
  onSuccess: (accessToken: string, userId: number) => void
  onBack: () => void
  onDeactivated: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (res.status === 403) {
        const d = await res.json().catch(() => ({}))
        if (d.detail?.code === 'ACCOUNT_DEACTIVATED') {
          onDeactivated(password)
          return
        }
        setError('접근이 거부되었습니다.')
        return
      }
      if (!res.ok) {
        setError('이메일 또는 비밀번호를 확인해 주세요.')
        return
      }
      const data = await res.json()
      onSuccess(data.access_token, data.user_id)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* 이메일 표시 (수정 가능) */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: '#0071e3',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          alignSelf: 'flex-start',
        }}
      >
        ← {email}
      </button>

      <FloatingInput
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        autoFocus
      />

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <PrimaryBtn disabled={loading || !password} loading={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </PrimaryBtn>
    </form>
  )
}

function SignupStep({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ email: '', nickname: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail ?? '회원가입에 실패했습니다.')
        return
      }
      setDone(true)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '16px 0' }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', marginBottom: 6 }}>
          가입 완료!
        </p>
        <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 20 }}>
          {form.email} 계정이 생성되었습니다.
        </p>
        <PrimaryBtn type="button" onClick={onDone}>로그인하러 가기</PrimaryBtn>
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <FloatingInput label="이메일" type="email" value={form.email}
        onChange={(v) => setForm(f => ({ ...f, email: v }))} autoComplete="email" autoFocus />
      <FloatingInput label="닉네임" type="text" value={form.nickname}
        onChange={(v) => setForm(f => ({ ...f, nickname: v }))} autoComplete="username" />
      <FloatingInput label="비밀번호" type="password" value={form.password}
        onChange={(v) => setForm(f => ({ ...f, password: v }))} autoComplete="new-password" />

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <PrimaryBtn disabled={loading || !form.email || !form.nickname || !form.password} loading={loading}>
        {loading ? '처리 중...' : '계속하기'}
      </PrimaryBtn>
    </form>
  )
}

// ─── 계정 복구 (30일 이내 탈퇴 계정) ─────────────────────────────────────────

function ReactivateStep({
  email,
  password,
  onDone,
  onBack,
}: {
  email: string
  password: string
  onDone: (accessToken: string, userId: number) => void
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReactivate = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('계정 복구에 실패했습니다. 다시 시도해 주세요.')
        return
      }
      const data = await res.json()
      onDone(data.access_token, data.user_id)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        padding: '14px 16px',
        background: '#FFF3CD',
        border: '1px solid #FFECB5',
        borderRadius: 10,
        fontSize: 13,
        color: '#856404',
        lineHeight: 1.6,
      }}>
        탈퇴 후 30일 이내 계정입니다.<br />
        계정을 복구하시면 이전 데이터를 그대로 유지할 수 있습니다.
      </div>

      <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 500, color: '#1D1D1F', margin: 0 }}>
        복귀하시겠습니까?
      </p>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: 13, color: '#FF3B30', margin: 0, textAlign: 'center' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryBtn type="button" onClick={handleReactivate} loading={loading} disabled={loading}>
          {loading ? '복구 중...' : '복귀하기'}
        </PrimaryBtn>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: '100%',
            borderRadius: 12,
            padding: '14px 0',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            background: 'transparent',
            color: '#6e6e73',
            border: '1.5px solid #d2d2d7',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  )
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────

const TITLES: Record<Step, { title: string; sub: string }> = {
  email:      { title: 'Study Hub',   sub: '계정으로 로그인하세요' },
  password:   { title: 'Study Hub',   sub: '비밀번호를 입력하세요' },
  signup:     { title: '계정 만들기', sub: 'Study Hub에 오신 것을 환영합니다' },
  reactivate: { title: '계정 복구',   sub: '탈퇴 후 30일 이내 계정을 복구하세요' },
}

export default function AuthPage() {
  const location = useLocation()
  const initialStep: Step = (location.state as { step?: Step } | null)?.step ?? 'email'
  const [step, setStep] = useState<Step>(initialStep)
  const [email, setEmail] = useState('')
  const [deactivatedPassword, setDeactivatedPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLoginSuccess = async (accessToken: string, userId: number) => {
    await login(accessToken, userId)
    navigate('/community', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F5F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
          padding: '40px 36px 36px',
        }}
      >
        {/* 로고 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <StudyHubLogo size={110} variant="page" />
        </div>

        {/* 타이틀 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step + '-title'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: 'center', marginBottom: 28 }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#1D1D1F',
                margin: '0 0 6px',
              }}
            >
              {TITLES[step].title}
            </h1>
            <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, letterSpacing: '-0.01em' }}>
              {TITLES[step].sub}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 단계별 폼 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 'signup' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === 'signup' ? 20 : -20 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 'email' && (
              <EmailStep
                onNext={(e) => { setEmail(e); setStep('password') }}
                initialEmail={email}
              />
            )}
            {step === 'password' && (
              <PasswordStep
                email={email}
                onSuccess={handleLoginSuccess}
                onBack={() => setStep('email')}
                onDeactivated={(pwd) => { setDeactivatedPassword(pwd); setStep('reactivate') }}
              />
            )}
            {step === 'signup' && (
              <SignupStep onDone={() => setStep('email')} />
            )}
            {step === 'reactivate' && (
              <ReactivateStep
                email={email}
                password={deactivatedPassword}
                onDone={handleLoginSuccess}
                onBack={() => setStep('email')}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* 하단 링크 */}
        {(step === 'email' || step === 'password') && (
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6e6e73' }}>
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={() => setStep('signup')}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#0071e3',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              계정 만들기
            </button>
          </p>
        )}
        {step === 'signup' && (
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6e6e73' }}>
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={() => setStep('email')}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#0071e3',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              로그인
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
