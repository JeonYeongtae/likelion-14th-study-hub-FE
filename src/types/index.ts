// ─── Liquid Glass / Shader Types ─────────────────────────────────────────────

export interface UV {
  x: number
  y: number
}

/** Fragment function: maps an input UV to a displaced UV. */
export type FragmentFn = (uv: UV, mouse?: UV) => UV

export interface ShaderOptions {
  width: number
  height: number
  fragment?: FragmentFn
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

export interface LiquidGlassBaseProps {
  children?: React.ReactNode
  className?: string
  borderRadius?: number | string
  /** blur strength in px (default 20) */
  blur?: number
  /** RGBA tint color (default 'rgba(255,255,255,0.18)') */
  tint?: string
  /** Apply SVG turbulence distortion filter (default true) */
  withDistortion?: boolean
  style?: React.CSSProperties
}

export interface LiquidToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export interface LiquidSliderProps {
  value: number          // 0-100
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
}

export interface Category {
  id: string
  label: string
  icon?: string
  /** Unread / count badge (≥1 shows dot or number) */
  badge?: number
}

export interface CategorySelectorProps {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
  className?: string
  /** 'dark' (default) for dark backgrounds, 'light' for white/light backgrounds */
  theme?: 'dark' | 'light'
}
