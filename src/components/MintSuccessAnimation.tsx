import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IRYS_IMAGE_BASE, IRYS_METADATA_BASE } from '@/lib/config'
import { playDoorWhoosh, playFootsteps, stopFootsteps, playMovieReveal } from '@/lib/sound'

const DOOR_DURATION_MS = 10000
const DOOR_START_MS = 400
const DOOR_TRANSITION_MS = DOOR_DURATION_MS - DOOR_START_MS
const MALL_REVEAL_AFTER_MS = 5000
const MALL_REVEAL_DURATION_MS = 5000
const HOLD_MALL_MS = 0
const NFT_WALK_MS = 2500
const HOLD_NFT_MS = 2000

type Phase = 'doors' | 'mall' | 'nft' | 'done'

interface MintSuccessAnimationProps {
  tokenId: number
  txHash: string
  onComplete: () => void
}

export const MintSuccessAnimation: React.FC<MintSuccessAnimationProps> = ({
  tokenId,
  txHash,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('doors')
  const [doorsOpen, setDoorsOpen] = useState(false)
  const [mallReveal, setMallReveal] = useState(false)
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const t0 = setTimeout(() => playDoorWhoosh().catch(() => {}), 200)
    return () => clearTimeout(t0)
  }, [])

  // Resolve image from token metadata (IRYS json points to image path).
  // The reveal UI must not assume `/tokenId.png` exists at IRYS_IMAGE_BASE root.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const metaUrl = `${IRYS_METADATA_BASE}${tokenId}.json`
        const res = await fetch(metaUrl)
        if (!res.ok) throw new Error(`Metadata fetch failed: ${res.status}`)
        const meta = await res.json()
        const img = meta?.image
        if (!cancelled && typeof img === 'string' && img.length > 0) {
          setResolvedImageUrl(img)
        }
      } catch {
        // Keep fallback image guess below.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tokenId])

  useEffect(() => {
    const t1 = setTimeout(() => setDoorsOpen(true), DOOR_START_MS)
    const tMall = setTimeout(() => {
      setMallReveal(true)
      playFootsteps()
    }, MALL_REVEAL_AFTER_MS)
    const t2 = setTimeout(() => setPhase('mall'), DOOR_DURATION_MS)
    const t3 = setTimeout(() => {
      stopFootsteps()
      playMovieReveal()
      setPhase('nft')
    }, DOOR_DURATION_MS + HOLD_MALL_MS)
    const t4 = setTimeout(() => setPhase('done'), DOOR_DURATION_MS + HOLD_MALL_MS + NFT_WALK_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(tMall)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      stopFootsteps()
    }
  }, [])

  const nftImageUrl = resolvedImageUrl ?? `${IRYS_IMAGE_BASE}${tokenId}.png`
  const nftImageUrlFallback = resolvedImageUrl ? `${IRYS_IMAGE_BASE}${tokenId}.png` : `${IRYS_IMAGE_BASE}${tokenId}`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black">
      {/* Mall: hidden first 5s (tinted glass only), then fades in + slow zoom = walking in */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/mall-bg.png)',
          filter: 'blur(5px)',
          opacity: mallReveal ? 1 : 0,
          transform: mallReveal ? 'scale(1.2)' : 'scale(1)',
          transition: `opacity ${MALL_REVEAL_DURATION_MS}ms linear, transform ${MALL_REVEAL_DURATION_MS}ms linear`,
        }}
      />

      {/* Purple/white glow from inside - visible from start of door open (first 5s you see this + tinted glass) */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          opacity: doorsOpen ? 0.92 : 0,
          transition: `opacity 3000ms linear`,
          background: 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(180,140,220,0.45) 0%, rgba(122,44,133,0.35) 35%, rgba(60,20,80,0.2) 60%, transparent 75%)',
          boxShadow: 'inset 0 0 140px rgba(200,180,255,0.25)',
        }}
      />

      {/* Tinted glass doors - finish opening as footsteps end (5s footsteps from 5s–10s) */}
      <div className="absolute inset-0 z-10 flex pointer-events-none">
        <div
          className="w-1/2 h-full border-r-2 border-primary/40 shadow-[inset_0_0_80px_rgba(122,44,133,0.4)]"
          style={{
            background: 'linear-gradient(to right, rgba(20,8,28,0.94) 0%, rgba(50,22,65,0.7) 50%, rgba(80,35,90,0.3) 100%)',
            transform: doorsOpen ? 'translateX(-100%)' : 'translateX(0)',
            transition: `transform ${DOOR_TRANSITION_MS}ms linear`,
          }}
        />
        <div
          className="w-1/2 h-full border-l-2 border-primary/40 shadow-[inset_0_0_80px_rgba(122,44,133,0.4)]"
          style={{
            background: 'linear-gradient(to left, rgba(20,8,28,0.94) 0%, rgba(50,22,65,0.7) 50%, rgba(80,35,90,0.3) 100%)',
            transform: doorsOpen ? 'translateX(100%)' : 'translateX(0)',
            transition: `transform ${DOOR_TRANSITION_MS}ms linear`,
          }}
        />
      </div>

      {/* NFT: small in the distance, walks toward user; they meet in the middle */}
      {(phase === 'nft' || phase === 'done') && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center p-8 ${
            phase === 'nft'
              ? 'animate-[nfWalkToward_2.5s_ease-out_forwards]'
              : ''
          }`}
          style={
            phase === 'nft'
              ? {}
              : { opacity: 1, transform: 'translateY(0) scale(1)' }
          }
        >
          <div className="relative rounded-2xl overflow-hidden border-2 border-primary/60 shadow-[0_0_40px_rgba(122,44,133,0.5)] bg-card/95 max-w-[280px] w-full aspect-square">
            <img
              src={nftImageUrl}
              alt={`SPLRG #${tokenId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement
                if (t.src !== nftImageUrlFallback) t.src = nftImageUrlFallback
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-3 px-4 text-center">
              <p className="font-heading font-bold text-white text-lg">
                SPLRG #{tokenId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Continue button (when done) */}
      {phase === 'done' && (
        <div className="absolute bottom-12 left-0 right-0 z-30 flex justify-center animate-fade-in">
          <Button
            size="lg"
            className="btn-primary px-8 py-6 text-lg font-heading font-bold rounded-xl"
            onClick={onComplete}
          >
            Continue to spin the wheel
          </Button>
        </div>
      )}

      {/* Keyframe: NFT walks toward user, then bounces in on arrival (sync with glitch sound) */}
      <style>{`
        @keyframes nfWalkToward {
          0% {
            opacity: 0;
            transform: translateY(180px) scale(0.18);
          }
          72% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          82% {
            transform: translateY(-10px) scale(1.06);
          }
          92% {
            transform: translateY(4px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
