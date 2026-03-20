/**
 * Spin wheel prize configuration.
 * weight: relative chance (e.g. 1 = equal share). For 33.3% each, use 1, 1, 1.
 * To add more prizes later, push new entries and adjust weights (e.g. 1, 1, 1, 2 for 20/20/20/40).
 */
export interface WheelPrize {
  id: string
  label: string
  value: string // for recording (e.g. "100 $MON")
  weight: number // currently informational; selection is uniform per remaining ticket instance
  color: string // Tailwind class or CSS color for segment
}

export const WHEEL_PRIZES: WheelPrize[] = [
  // Wheel "tickets": if you want a prize to appear multiple times, include multiple entries
  // (same label/value/color, but unique `id`). After a ticket is won, it is removed.
  { id: 'mon_1', label: '100 $MON', value: '100 $MON', weight: 1, color: '#C9A962' },    // premium muted gold
  { id: 'splrg_1', label: '200 $SPLRG', value: '200 $SPLRG', weight: 1, color: '#7B5C8A' }, // premium muted purple
  { id: 'none_1', label: 'Better Luck Next Time', value: 'Better Luck Next Time', weight: 1, color: '#3D3D3D' }, // soft charcoal
]

/** Pick a random prize index by weight */
export function pickRandomPrizeIndex(): number {
  // Selection is uniform per remaining ticket instance.
  return Math.floor(Math.random() * WHEEL_PRIZES.length)
}

export const DEFAULT_WHEEL_ROUND = 'default'
