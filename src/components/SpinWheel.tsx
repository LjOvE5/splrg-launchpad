import React, { useRef, useState, useCallback } from 'react'
import { WHEEL_PRIZES, pickRandomPrizeIndex, type WheelPrize } from '@/config/wheel'

const SEGMENT_ANGLES = WHEEL_PRIZES.map((_, i) => (360 / WHEEL_PRIZES.length) * (i + 1)) // cumulative: 120, 240, 360
const SEGMENT_DEG = 360 / WHEEL_PRIZES.length // 120
const SPIN_DURATION_MS = 5000
const EXTRA_ROTATIONS = 5

interface SpinWheelProps {
  onComplete: (prize: WheelPrize) => void
  size?: number
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ onComplete, size = 280 }) => {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const resultIndexRef = useRef<number | null>(null)

  const spin = useCallback(() => {
    if (isSpinning) return
    const index = pickRandomPrizeIndex()
    resultIndexRef.current = index
    setIsSpinning(true)
    // Center of winning segment (degrees from top): index * 120 + 60
    const segmentCenter = index * SEGMENT_DEG + SEGMENT_DEG / 2
    // Final rotation so pointer (top) points to that segment: we rotate wheel, so pointer stays at 0; wheel angle at top = -rotation. We want -rotation mod 360 = segmentCenter, so rotation = 360 - segmentCenter + 360*k
    const finalAngle = 360 * EXTRA_ROTATIONS + (360 - segmentCenter)
    setRotation(finalAngle)

    const timer = setTimeout(() => {
      setIsSpinning(false)
      onComplete(WHEEL_PRIZES[resultIndexRef.current!])
    }, SPIN_DURATION_MS)
    return () => clearTimeout(timer)
  }, [onComplete, isSpinning])

  const radius = size / 2
  const innerR = radius - 8 // inner gap for center circle

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Pointer at top */}
        <div
          className="absolute left-1/2 -top-1 z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: `${Math.max(20, size * 0.065)}px solid rgba(160,140,100,0.9)`,
          }}
        />
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
            boxShadow: '0 0 0 2px rgba(120,120,120,0.25), 0 0 32px rgba(0,0,0,0.2)',
          }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-full">
            {WHEEL_PRIZES.map((prize, i) => {
              const startAngle = (i * 360) / WHEEL_PRIZES.length
              const endAngle = ((i + 1) * 360) / WHEEL_PRIZES.length
              const startRad = ((startAngle - 90) * Math.PI) / 180
              const endRad = ((endAngle - 90) * Math.PI) / 180
              const x1 = radius + innerR * Math.cos(startRad)
              const y1 = radius + innerR * Math.sin(startRad)
              const x2 = radius + innerR * Math.cos(endRad)
              const y2 = radius + innerR * Math.sin(endRad)
              const large = endAngle - startAngle > 180 ? 1 : 0
              const d = [
                `M ${radius} ${radius}`,
                `L ${x1} ${y1}`,
                `A ${innerR} ${innerR} 0 ${large} 1 ${x2} ${y2}`,
                'Z',
              ].join(' ')
              return (
                <path
                  key={prize.id}
                  d={d}
                  fill={prize.color}
                  stroke="rgba(80,80,80,0.4)"
                  strokeWidth={1.5}
                />
              )
            })}
            {/* Center circle */}
            <circle
              cx={radius}
              cy={radius}
              r={20}
              fill="hsl(var(--card))"
              stroke="rgba(80,80,80,0.35)"
              strokeWidth={1.5}
            />
            {/* Labels: rotate each segment and put text in middle */}
            {WHEEL_PRIZES.map((prize, i) => {
              const midAngle = ((i + 0.5) * 360) / WHEEL_PRIZES.length - 90
              const rad = (midAngle * Math.PI) / 180
              const labelR = innerR * 0.65
              const x = radius + labelR * Math.cos(rad)
              const y = radius + labelR * Math.sin(rad)
              const rot = (i + 0.5) * (360 / WHEEL_PRIZES.length)
              return (
                <g key={`label-${prize.id}`} transform={`translate(${x}, ${y}) rotate(${rot})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.95)"
                    fontSize={size * 0.048}
                    fontWeight="600"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {prize.label.length > 18 ? prize.label.slice(0, 16) + '…' : prize.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <button
        type="button"
        onClick={spin}
        disabled={isSpinning}
        className="btn-gold rounded-xl px-8 py-3 font-heading font-semibold disabled:opacity-60"
      >
        {isSpinning ? 'Spinning…' : 'Spin'}
      </button>
    </div>
  )
}
