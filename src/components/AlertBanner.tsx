/**
 * AlertBanner — 헤더바 아래로 드롭다운되는 글래스모피즘 알림 배너
 *
 * - success / error / info : 4초 자동 해제 + 원형 '확인' 버튼 (liquidglass)
 * - confirm               : '취소' + '확인' 버튼 — Promise<boolean> 으로 resolve
 *
 * 가운데 정렬 방식:
 *   고정 래퍼(fixed, inset-x: 0, flex center)로 수평 중앙을 잡고,
 *   motion.div는 y/scale/opacity 애니메이션만 담당 → transform 충돌 없음
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useAlert } from '../contexts/AlertContext'

const TYPE_CONFIG = {
  success: {
    color:  '#34c759',
    bg:     'rgba(52,199,89,0.12)',
    border: 'rgba(52,199,89,0.28)',
    icon:   '✓',
    glow:   'rgba(52,199,89,0.20)',
  },
  error: {
    color:  '#ff3b30',
    bg:     'rgba(255,59,48,0.10)',
    border: 'rgba(255,59,48,0.25)',
    icon:   '✕',
    glow:   'rgba(255,59,48,0.16)',
  },
  info: {
    color:  '#E07535',
    bg:     'rgba(224,117,53,0.11)',
    border: 'rgba(224,117,53,0.28)',
    icon:   'i',
    glow:   'rgba(224,117,53,0.18)',
  },
  confirm: {
    color:  '#1d1d1f',
    bg:     'rgba(0,0,0,0.05)',
    border: 'rgba(0,0,0,0.12)',
    icon:   '?',
    glow:   'rgba(0,0,0,0.07)',
  },
}

export default function AlertBanner() {
  const { alert, dismiss, handleConfirm, handleCancel } = useAlert()
  const cfg = alert ? TYPE_CONFIG[alert.type] : TYPE_CONFIG.info

  return (
    <AnimatePresence>
      {alert && (
        /* ── 고정 래퍼: 수평 중앙 정렬 담당 (transform 없음) ── */
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            zIndex: 300,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px',
            pointerEvents: 'none',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
          }}
        >
          {/* ── motion.div: y / scale / opacity 애니메이션만 담당 ── */}
          <motion.div
            key={alert.message + alert.type}
            initial={{ y: -80, opacity: 0, scale: 0.94 }}
            animate={{ y: 0,   opacity: 1, scale: 1   }}
            exit={{   y: -80, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36, mass: 0.65 }}
            style={{
              width: '100%',
              maxWidth: 500,
              pointerEvents: 'auto',
            }}
          >
            {/* ── 배너 카드 ── */}
            <div
              style={{
                background: 'rgba(255,255,255,0.84)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: `1px solid ${cfg.border}`,
                borderRadius: 28,
                padding: '14px 16px 14px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: `0 10px 40px rgba(0,0,0,0.11), 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px ${cfg.glow}`,
              }}
            >
              {/* 타입 아이콘 */}
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: cfg.bg,
                  border: `1.5px solid ${cfg.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: alert.type === 'confirm' ? 15 : 13,
                  fontWeight: 700,
                  color: cfg.color,
                }}
              >
                {cfg.icon}
              </div>

              {/* 메시지 */}
              <p
                style={{
                  flex: 1, fontSize: 14, color: '#1d1d1f',
                  lineHeight: 1.45, margin: 0, letterSpacing: '-0.01em',
                }}
              >
                {alert.message}
              </p>

              {/* 버튼 영역 */}
              {alert.type === 'confirm' ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {/* 취소 — 원형 글래스 */}
                  <motion.button
                    onClick={handleCancel}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.87 }}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.05)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0,0,0,0.13)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#6e6e73',
                      fontFamily: 'inherit',
                    }}
                  >
                    취소
                  </motion.button>
                  {/* 확인 — liquidglass 원형 */}
                  <motion.button
                    onClick={handleConfirm}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.87 }}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(224,117,53,0.15)',
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      border: '1px solid rgba(224,117,53,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#E07535',
                      fontFamily: 'inherit',
                      boxShadow: '0 2px 12px rgba(224,117,53,0.25)',
                    }}
                  >
                    확인
                  </motion.button>
                </div>
              ) : (
                /* 확인 — liquidglass 원형 (알림 닫기) */
                <motion.button
                  onClick={dismiss}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.87 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: cfg.bg,
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700, color: cfg.color,
                    fontFamily: 'inherit',
                    boxShadow: `0 2px 10px ${cfg.glow}`,
                  }}
                >
                  확인
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
