import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SpinWheel } from '@/components/SpinWheel'
import { WHEEL_PRIZES, WHEEL_TICKETS, getPrizeIndexById, DEFAULT_WHEEL_ROUND, type WheelPrize } from '@/config/wheel'
import { getWonPrizeTicketIds, insertSpinResult } from '@/lib/supabase'

type Step = 'prompt' | 'wheel' | 'result'

interface SpinWheelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  mintTxHash: string
  preview?: boolean
  onSpinFinished?: () => void
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  open,
  onOpenChange,
  walletAddress,
  mintTxHash,
  preview = false,
  onSpinFinished,
}) => {
  const [step, setStep] = useState<Step>('prompt')
  const [result, setResult] = useState<WheelPrize | null>(null)
  const [forcedPrizeIndex, setForcedPrizeIndex] = useState<number | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [spinRecorded, setSpinRecorded] = useState(false)

  const wheelRound = DEFAULT_WHEEL_ROUND
  const prizePool = WHEEL_PRIZES.filter((p) => p.id !== 'none')

  const handleSkip = () => {
    setStep('prompt')
    setResult(null)
    setForcedPrizeIndex(null)
    setSpinRecorded(false)
    onOpenChange(false)
  }

  const handleSpin = async () => {
    if (selecting) return
    setSelecting(true)
    if (preview) {
      try {
        const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length)
        // In preview mode we still want to "consume" the spin for the UI flow,
        // but we do NOT write anything to Supabase.
        setSpinRecorded(true)
        setForcedPrizeIndex(prizeIndex)
        setResult(null)
        setStep('wheel')
      } finally {
        setSelecting(false)
      }
      return
    }
    try {
      // Claim a remaining ticket in Supabase before the animation completes.
      // This prevents two users from getting the same ticket instance.
      let lastTicket: { prize: WheelPrize; prizeIndex: number } | null = null

      for (let attempt = 0; attempt < 6; attempt++) {
        const wonTicketIds = await getWonPrizeTicketIds(wheelRound)
        const availableTickets = WHEEL_TICKETS.filter((t) => !wonTicketIds.includes(t.id))

        if (availableTickets.length === 0) break

        const ticket = availableTickets[Math.floor(Math.random() * availableTickets.length)]
        const prizeIndex = getPrizeIndexById(ticket.prizeId)
        if (prizeIndex < 0) continue
        const prize = WHEEL_PRIZES[prizeIndex]

        lastTicket = { prize, prizeIndex }

        const saved = await insertSpinResult({
          wallet_address: walletAddress,
          prize: prize.value,
          prize_ticket_id: ticket.id,
          wheel_round: wheelRound,
          mint_tx_hash: mintTxHash,
        })

        if (saved) {
          setSpinRecorded(true)
          setForcedPrizeIndex(prizeIndex)
          setResult(prize)
          setStep('wheel')
          return
        }
        // If insert failed, it likely means another client claimed the same ticket.
      }

      // Fallback: show wheel result if we had a candidate, but don't decrement remaining spins.
      if (lastTicket) {
        setForcedPrizeIndex(lastTicket.prizeIndex)
        setResult(lastTicket.prize)
        setSpinRecorded(false)
        setStep('wheel')
      }
    } finally {
      setSelecting(false)
    }
  }

  const handleComplete = async (prize: WheelPrize) => {
    setResult(prize)
    setStep('result')
  }

  const handleClose = () => {
    setStep('prompt')
    setResult(null)
    setForcedPrizeIndex(null)
    const didRecord = spinRecorded
    setSpinRecorded(false)
    if (didRecord) onSpinFinished?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-strong border-border bg-card/95 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">
            {step === 'prompt' && 'Test your luck, spin the wheel for an extra prize!'}
            {step === 'wheel' && 'Spin for a chance to win'}
            {step === 'result' && (result?.id === 'none' ? 'No luck this time' : 'You won!')}
          </DialogTitle>
        </DialogHeader>

        {step === 'prompt' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="rounded-full bg-primary/10 p-3 ring-2 ring-primary/20">
              <img src="/splrg-logo-wheel.png" alt="SPLRG" className="h-16 w-16 object-contain" />
            </div>

            {/* Prize pool (shown before spin) */}
            <div className="w-full">
              <div className="text-sm font-semibold text-foreground mb-2">Prize pool</div>
              <div className="grid grid-cols-2 gap-2">
                {prizePool.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <span className="text-xs text-foreground font-medium">{p.label}</span>
                    <span className="text-[10px] text-muted-foreground">{p.ticketCount} tickets</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={handleSkip}
              >
                Skip
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={handleSpin}
                disabled={selecting}
              >
                {selecting ? 'Choosing…' : 'Spin'}
              </Button>
            </div>
          </div>
        )}

        {step === 'wheel' && (
          <div className="py-2">
            <SpinWheel
              onComplete={handleComplete}
              size={360}
              forcedPrizeIndex={forcedPrizeIndex}
              showSegmentLabels={false}
            />
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className={`rounded-xl border-2 px-6 py-4 text-center animate-[resultBounce_0.6s_ease-out] ${result.id === 'none' ? 'border-muted-foreground/50 bg-muted/30' : 'border-accent/50 bg-accent/10'}`}>
              <p className="text-sm text-muted-foreground">You got</p>
              <p className="font-heading text-2xl font-bold text-foreground">{result.value}</p>
            </div>
            <style>{`
              @keyframes resultBounce {
                0% { transform: scale(0.9); opacity: 0.8; }
                60% { transform: scale(1.05); }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <Button className="w-full btn-primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
