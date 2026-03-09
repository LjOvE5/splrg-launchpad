/**
 * Spin wheel prize configuration.
 * weight: relative chance (e.g. 1 = equal share). For 33.3% each, use 1, 1, 1.
 * To add more prizes later, push new entries and adjust weights (e.g. 1, 1, 1, 2 for 20/20/20/40).
 */
export interface WheelPrize {
  id: string
  label: string
  value: string // for recording (e.g. "100 $MON")
  weight: number
  color: string // Tailwind class or CSS color for segment
}

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'mon', label: '100 $MON', value: '100 $MON', weight: 1, color: '#C9A962' },   // premium muted gold
  { id: 'splrg', label: '200 $SPLRG', value: '200 $SPLRG', weight: 1, color: '#7B5C8A' }, // premium muted purple
  { id: 'none', label: 'Better Luck Next Time', value: 'Better Luck Next Time', weight: 1, color: '#3D3D3D' }, // soft charcoal
]

const totalWeight = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0)
export const WHEEL_PRIZE_ANGLES = WHEEL_PRIZES.map((p) => (p.weight / totalWeight) * 360)

/** Pick a random prize index by weight */
export function pickRandomPrizeIndex(): number {
  const r = Math.random() * totalWeight
  let acc = 0
  for (let i = 0; i < WHEEL_PRIZES.length; i++) {
    acc += WHEEL_PRIZES[i].weight
    if (r < acc) return i
  }
  return WHEEL_PRIZES.length - 1
}
