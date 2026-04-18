/**
 * NebulaOverlay.tsx
 *
 * 로그인 전환 애니메이션 오버레이.
 * 로고가 있던 화면 중앙에서 보라/파랑/핑크 성운(Nebula) 빛이 폭발적으로 퍼지고,
 * 화면 전체를 감싼 뒤 걷히면서 AuthPage가 드러나는 효과.
 *
 * Timeline (총 1.85s):
 *  0–150ms  : 어두운 배경 페이드 인
 *  80–900ms : 6개 컬러 블롭이 중앙에서 폭발하듯 확장
 *  950–1100ms: 화이트 플래시 (이 시점에 navigate 발생)
 *  1100–1850ms: 화이트 걷힘 → AuthPage 드러남
 */

import { motion, AnimatePresence } from 'framer-motion'

const BLOBS = [
  { color: 'rgba(139,92,246,1)',    size: 720, delay: 0,    dx: 0,    dy: 0    },
  { color: 'rgba(59,130,246,0.92)', size: 580, delay: 0.05, dx: -95,  dy: 75   },
  { color: 'rgba(236,72,153,0.90)', size: 660, delay: 0.02, dx: 115,  dy: -58  },
  { color: 'rgba(99,102,241,0.92)', size: 840, delay: 0.09, dx: -58,  dy: -95  },
  { color: 'rgba(249,115,22,0.76)', size: 500, delay: 0.12, dx: 80,   dy: 85   },
  { color: 'rgba(168,85,247,0.82)', size: 580, delay: 0.04, dx: -32,  dy: 115  },
]

interface Props {
  visible: boolean
}

export default function NebulaOverlay({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nebula"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.01 } }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
          }}
        >
          {/* 어두운 베이스 배경 — 블롭 색이 선명하게 보이도록 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 1.85, times: [0, 0.08, 0.50, 0.60, 1], ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, background: '#03030a' }}
          />

          {/* 성운 컬러 블롭 */}
          {BLOBS.map((blob, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.7, 5.5],
                opacity: [0, 0.88, 0],
              }}
              transition={{
                duration: 1.45,
                delay: blob.delay,
                ease: [0.12, 0.82, 0.28, 1],
                times: [0, 0.28, 1],
              }}
              style={{
                position: 'absolute',
                width: blob.size,
                height: blob.size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 50%, ${blob.color} 0%, transparent 68%)`,
                filter: 'blur(32px)',
                left: `calc(50% - ${blob.size / 2}px + ${blob.dx}px)`,
                top: `calc(50% - ${blob.size / 2}px + ${blob.dy}px)`,
              }}
            />
          ))}

          {/* 화이트 플래시 — 화면 전환을 감추는 커튼 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{
              duration: 1.85,
              times: [0, 0.48, 0.60, 0.70, 1],
              ease: 'linear',
            }}
            style={{ position: 'absolute', inset: 0, background: '#F5F5F7' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
