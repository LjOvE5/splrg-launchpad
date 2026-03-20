import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SpinWheel } from '@/components/SpinWheel'
import { WHEEL_PRIZES, DEFAULT_WHEEL_ROUND, type WheelPrize } from '@/config/wheel'
import { getWonPrizeTicketIds, insertSpinResult } from '@/lib/supabase'

type Step = 'prompt' | 'wheel' | 'result'

interface SpinWheelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  mintTxHash: string
  onRecorded?: () => void
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  open,
  onOpenChange,
  walletAddress,
  mintTxHash,
  onRecorded,
}) => {
  const [step, setStep] = useState<Step>('prompt')
  const [result, setResult] = useState<WheelPrize | null>(null)
  const [forcedPrizeIndex, setForcedPrizeIndex] = useState<number | null>(null)
  const [selecting, setSelecting] = useState(false)

  const wheelRound = DEFAULT_WHEEL_ROUND

  const handleSkip = () => {
    setStep('prompt')
    setResult(null)
    setForcedPrizeIndex(null)
    onOpenChange(false)
  }

  const handleSpin = async () => {
    if (selecting) return
    setSelecting(true)
    try {
      // Claim a remaining prize ticket in Supabase before the animation completes.
      // This avoids double-assigning the same ticket under concurrent spins.
      let lastPick: { p: WheelPrize; idx: number } | null = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const wonTicketIds = await getWonPrizeTicketIds(wheelRound)
        const available = WHEEL_PRIZES
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => !wonTicketIds.includes(p.id))

        const pick =
          available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : { p: WHEEL_PRIZES[WHEEL_PRIZES.length - 1], idx: WHEEL_PRIZES.length - 1 }

        lastPick = pick

        const saved = await insertSpinResult({
          wallet_address: walletAddress,
          prize: pick.p.value,
          prize_ticket_id: pick.p.id,
          wheel_round: wheelRound,
          mint_tx_hash: mintTxHash,
        })

        if (saved) {
          onRecorded?.()
          setForcedPrizeIndex(pick.idx)
          setResult(pick.p)
          setStep('wheel')
          return
        }
        // If insert failed, it likely means another client claimed the same ticket.
      }

      // If we couldn't claim (should be rare), still show the wheel landing on the last pick.
      if (lastPick) {
        setForcedPrizeIndex(lastPick.idx)
        setResult(lastPick.p)
        setStep('wheel')
      } else {
        setStep('result')
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
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-strong border-border bg-card/95 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">
            {step === 'prompt' && 'Test your luck, spin the wheel for an extra prize!'}
            {step === 'wheel' && 'Spin for a chance to win'}
            {step === 'result' && (result?.id === 'none' ? 'Better luck next time' : 'You won!')}
          </DialogTitle>
        </DialogHeader>

        {step === 'prompt' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="rounded-full bg-primary/10 p-3 ring-2 ring-primary/20">
              <img src="/splrg-logo-wheel.png" alt="SPLRG" className="h-16 w-16 object-contain" />
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
            <SpinWheel onComplete={handleComplete} size={360} forcedPrizeIndex={forcedPrizeIndex} />
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
