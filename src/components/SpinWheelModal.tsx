import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SpinWheel } from '@/components/SpinWheel'
import { WHEEL_PRIZES, type WheelPrize } from '@/config/wheel'
import { insertSpinResult } from '@/lib/supabase'

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

  const handleSkip = () => {
    setStep('prompt')
    setResult(null)
    onOpenChange(false)
  }

  const handleSpin = () => {
    setStep('wheel')
  }

  const handleComplete = async (prize: WheelPrize) => {
    setResult(prize)
    const saved = await insertSpinResult({
      wallet_address: walletAddress,
      prize: prize.value,
      mint_tx_hash: mintTxHash,
    })
    if (saved) onRecorded?.()
    setStep('result')
  }

  const handleClose = () => {
    setStep('prompt')
    setResult(null)
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
              >
                Spin
              </Button>
            </div>
          </div>
        )}

        {step === 'wheel' && (
          <div className="py-2">
            <SpinWheel onComplete={handleComplete} size={360} />
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
