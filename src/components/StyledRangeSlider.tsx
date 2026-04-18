/**
 * StyledRangeSlider — 커스텀 인원 조절 슬라이더
 *
 * - 마우스를 부드럽게 따라가는 thumb (CSS transition)
 * - 드래그 중: track 두꺼워짐, thumb → 둥근 직사각형 + 커짐
 * - 비활성 상태: thumb → 원형
 * - 오렌지 그라데이션 fill + 그림자 효과
 */

import { useState } from 'react'

interface StyledRangeSliderProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}

export default function StyledRangeSlider({ min, max, value, onChange }: StyledRangeSliderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div
      style={{
        position: 'relative',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        marginTop: 6,
        /* 양 끝에서 thumb가 잘리지 않도록 좌우 여백 */
        padding: '0 2px',
      }}
    >
      {/* ── 비주얼 트랙 ── */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0,
          height: isDragging ? 8 : 5,
          borderRadius: 999,
          background: '#e5e5ea',
          transition: 'height 0.22s ease',
          overflow: 'visible',
        }}
      >
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #E07535 0%, #F09050 100%)',
            boxShadow: isDragging ? '0 0 8px rgba(224,117,53,0.30)' : 'none',
            transition: isDragging
              ? 'box-shadow 0.2s ease'
              : 'width 0.08s ease, box-shadow 0.2s ease',
          }}
        />
      </div>

      {/* ── 비주얼 Thumb ── */}
      <div
        style={{
          position: 'absolute',
          left: `${pct}%`,
          transform: 'translate(-50%, 0)',
          width:        isDragging ? 22 : 16,
          height:       isDragging ? 14 : 16,
          borderRadius: isDragging ? 7  : '50%',
          background: '#ffffff',
          border: `2px solid ${isDragging ? '#E07535' : 'rgba(224,117,53,0.65)'}`,
          boxShadow: isDragging
            ? '0 2px 14px rgba(224,117,53,0.40), 0 1px 4px rgba(0,0,0,0.15)'
            : '0 1px 7px rgba(0,0,0,0.18)',
          transition:
            'width 0.22s ease, height 0.22s ease, border-radius 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── 투명 Native Input (히트 영역) ── */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: isDragging ? 'grabbing' : 'grab',
          margin: 0,
          padding: 0,
          zIndex: 2,
        }}
      />
    </div>
  )
}
