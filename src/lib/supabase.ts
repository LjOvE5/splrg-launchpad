import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export interface SpinResult {
  id?: string
  wallet_address: string
  prize: string
  prize_ticket_id?: string
  wheel_round?: string
  mint_tx_hash: string | null
  created_at?: string
}

const TABLE = 'spin_results'

export async function insertSpinResult(row: Omit<SpinResult, 'id' | 'created_at'>): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to track wheel results.')
    return false
  }
  try {
    const { error } = await supabase.from(TABLE).insert({
      wallet_address: row.wallet_address.toLowerCase(),
      prize: row.prize,
      prize_ticket_id: row.prize_ticket_id || null,
      wheel_round: row.wheel_round || 'default',
      mint_tx_hash: row.mint_tx_hash || null,
    })
    if (error) {
      console.error('Supabase insert spin_result:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('insertSpinResult', e)
    return false
  }
}

export async function getSpinResults(limit = 200): Promise<SpinResult[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('Supabase getSpinResults:', error)
      return []
    }
    return (data as SpinResult[]) || []
  } catch (e) {
    console.error('getSpinResults', e)
    return []
  }
}

export async function getWonPrizeTicketIds(wheel_round: string): Promise<string[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('prize_ticket_id')
      .eq('wheel_round', wheel_round)
      .not('prize_ticket_id', 'is', null)

    if (error) {
      console.error('getWonPrizeTicketIds:', error)
      return []
    }
    return (data || [])
      .map((r: any) => r.prize_ticket_id as string)
      .filter(Boolean)
  } catch (e) {
    console.error('getWonPrizeTicketIds', e)
    return []
  }
}

export function isSupabaseConfigured(): boolean {
  return !!supabase
}
