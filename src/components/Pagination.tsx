import { motion } from 'framer-motion'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  style?: React.CSSProperties
}

const PAGE_SLOT = 7
const BTN_SIZE = 36
const GAP = 6
const PAGE_AREA_WIDTH = PAGE_SLOT * BTN_SIZE + (PAGE_SLOT - 1) * GAP // 288px

export default function Pagination({ page, totalPages, onChange, style }: PaginationProps) {
  const count = Math.min(totalPages, PAGE_SLOT)
  const startPage = Math.max(1, Math.min(page - Math.floor(PAGE_SLOT / 2), totalPages - PAGE_SLOT + 1))
  const pages = Array.from({ length: count }, (_, i) => startPage + i)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      <ArrowBtn direction="left" disabled={page <= 1} onClick={() => onChange(page - 1)} />

      <div style={{ width: PAGE_AREA_WIDTH, display: 'flex', justifyContent: 'center', gap: GAP }}>
        {pages.map(p => (
          <PageBtn key={p} active={p === page} onClick={() => onChange(p)}>
            {p}
          </PageBtn>
        ))}
      </div>

      <ArrowBtn direction="right" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
    </div>
  )
}

function PageBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={active ? undefined : { scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      className={active ? 'liquid liquid-action' : 'liquid'}
      style={{
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: '50%',
        border: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : '#6e6e73',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </motion.button>
  )
}

function ArrowBtn({
  onClick,
  disabled,
  direction,
}: {
  onClick: () => void
  disabled: boolean
  direction: 'left' | 'right'
}) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      style={{
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        color: disabled ? '#d2d2d7' : '#6e6e73',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {direction === 'left' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </motion.button>
  )
}
