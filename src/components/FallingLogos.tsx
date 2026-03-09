import React, { useMemo } from 'react'

const LOGO_COUNT = 18
const FALL_DURATION_MIN = 12
const FALL_DURATION_MAX = 22
const SIZE_MIN = 20
const SIZE_MAX = 44
const OPACITY_MIN = 0.15
const OPACITY_MAX = 0.28

/**
 * Monad logo: white thick rounded-square frame, hollow center, soft shadow.
 * Matches reference: 45° rotated square with heavily rounded corners, concentric inner cutout.
 */
const MonadLogoSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="monad-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.35)" floodOpacity="1" />
      </filter>
    </defs>
    {/* Outer rounded square minus inner = thick white frame, then rotate 45° */}
    <path
      fillRule="evenodd"
      fill="white"
      filter="url(#monad-drop-shadow)"
      transform="rotate(45 20 20)"
      d="
        M 14 4 L 26 4 Q 36 4 36 14 L 36 26 Q 36 36 26 36 L 14 36 Q 4 36 4 26 L 4 14 Q 4 4 14 4 Z
        M 16 10 L 24 10 Q 30 10 30 16 L 30 24 Q 30 30 24 30 L 16 30 Q 10 30 10 24 L 10 16 Q 10 10 16 10 Z
      "
    />
  </svg>
)

function useFallingItems() {
  return useMemo(() => {
    return Array.from({ length: LOGO_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: FALL_DURATION_MIN + Math.random() * (FALL_DURATION_MAX - FALL_DURATION_MIN),
      delay: Math.random() * 15,
      size: SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN),
      opacity: OPACITY_MIN + Math.random() * (OPACITY_MAX - OPACITY_MIN),
    }))
  }, [])
}

export const FallingLogos: React.FC = () => {
  const items = useFallingItems()

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-fall-monad text-white"
          style={{
            left: `${item.left}%`,
            top: '-10%',
            width: item.size,
            height: item.size,
            opacity: item.opacity,
            animationDuration: `${item.duration}s`,
            animationDelay: `-${item.delay}s`,
          }}
        >
          <MonadLogoSvg className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}
