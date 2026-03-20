/**
 * Spin wheel prize configuration (frontend).
 *
 * Ticket model:
 * - Each prize type has `ticketCount` (number of available "tickets").
 * - Odds are proportional to remaining tickets.
 * - When a user wins, exactly 1 ticket instance is removed (tracked in Supabase via `prize_ticket_id`).
 *
 * The wheel UI is rendered using prize *types* only (so it stays readable),
 * while ticket instances are generated for Supabase tracking.
 */
export interface WheelPrize {
  id: string
  label: string
  value: string // for recording (e.g. "100 $MON")
  ticketCount: number
  color: string
}

export const WHEEL_PRIZES: WheelPrize[] = [
  // NFTs / Boxes
  { id: 'fuzzmo', label: 'Fuzzmo NFT', value: 'Fuzzmo NFT', ticketCount: 10, color: '#C9A962' },
  { id: 'lootify', label: 'Lootify Box', value: 'Lootify Box', ticketCount: 10, color: '#7B5C8A' },
  { id: 'mongang', label: 'Mongang NFT', value: 'Mongang NFT', ticketCount: 10, color: '#4F86C6' },
  { id: 'realnads', label: 'Real Nads', value: 'Real Nads', ticketCount: 5, color: '#2E9D7A' },
  { id: 'molandaks', label: 'Molandaks NFT', value: 'Molandaks NFT', ticketCount: 3, color: '#B064D6' },
  { id: 'sealuminati', label: 'Sealuminati', value: 'Sealuminati', ticketCount: 3, color: '#E07A5F' },
  { id: 'daks', label: 'Daks', value: 'Daks', ticketCount: 3, color: '#9BC53D' },
  { id: '10ksquad', label: '10ksquad', value: '10ksquad', ticketCount: 3, color: '#6B8E23' },

  // Tokens
  // Keeping the same amounts as the previous baseline config (unless you tell me otherwise).
  { id: 'mon', label: '100 $MON', value: '100 $MON', ticketCount: 50, color: '#C9A962' },
  { id: 'splrg', label: '200 $SPLRG', value: '200 $SPLRG', ticketCount: 100, color: '#7B5C8A' },

  // None / consolation
  { id: 'none', label: 'No luck this time', value: 'No luck this time', ticketCount: 300, color: '#3D3D3D' },
]

export interface WheelTicket {
  id: string // unique ticket instance id (used as `prize_ticket_id` in Supabase)
  prizeId: string // matches WheelPrize.id
}

export const DEFAULT_WHEEL_ROUND = 'default'

const TOTAL_TICKETS = WHEEL_PRIZES.reduce((s, p) => s + p.ticketCount, 0)

export function getPrizeIndexById(prizeId: string): number {
  return WHEEL_PRIZES.findIndex((p) => p.id === prizeId)
}

export function getTicketPool(): WheelTicket[] {
  // Expand ticket counts into unique ids for removal tracking.
  const tickets: WheelTicket[] = []
  for (const prize of WHEEL_PRIZES) {
    for (let i = 1; i <= prize.ticketCount; i++) {
      tickets.push({ id: `${prize.id}_${i}`, prizeId: prize.id })
    }
  }
  return tickets
}

export const WHEEL_TICKETS: WheelTicket[] = getTicketPool()

export function pickRandomPrizeTypeIndexByTickets(): number {
  // Fallback weighted pick (used only if forced selection isn't provided).
  const total = TOTAL_TICKETS || 1
  let r = Math.random() * total
  for (let i = 0; i < WHEEL_PRIZES.length; i++) {
    r -= WHEEL_PRIZES[i].ticketCount
    if (r < 0) return i
  }
  return WHEEL_PRIZES.length - 1
}
