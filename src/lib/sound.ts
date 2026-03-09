const CtxClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null
let sharedContext: InstanceType<NonNullable<typeof CtxClass>> | null = null

/** Door swoosh, footsteps, wind reveal (from public/). */
const SWOOSH_URL = '/Swoosh.wav'
const FOOTSTEPS_URL = '/Footsteps.wav'
const WIND_URL = '/Wind.wav'

/**
 * Call this on a user gesture (e.g. when user clicks Mint) so door whoosh can play later.
 * Browsers require a user gesture to start audio; the animation runs after the wallet closes.
 */
export async function prepareAudio(): Promise<void> {
  if (!CtxClass) return
  try {
    if (!sharedContext || sharedContext.state === 'closed') {
      sharedContext = new CtxClass()
    }
    if (sharedContext.state === 'suspended') {
      await sharedContext.resume()
    }
  } catch {}
}

async function playDoorWhooshWebAudio(): Promise<void> {
  if (!CtxClass) return
  try {
    const ctx = sharedContext && sharedContext.state !== 'closed' ? sharedContext : new CtxClass()
    const now = ctx.currentTime
    if (ctx.state === 'suspended') await ctx.resume()

    const duration = 1.2
    const bufferSize = Math.ceil(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.5)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 600
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    noise.start(now)
    noise.stop(now + duration)
  } catch {}
}

/**
 * Door swoosh: plays Swoosh.wav from public/. Use prepareAudio() when user clicks Mint.
 */
export async function playDoorWhoosh(): Promise<void> {
  try {
    const audio = new Audio(SWOOSH_URL)
    const played = audio.play()
    if (played && typeof played.then === 'function') {
      await played
      return
    }
  } catch {
    // file missing or playback blocked – use Web Audio
  }
  await playDoorWhooshWebAudio()
}

let footstepsAudio: HTMLAudioElement | null = null

/**
 * Play footsteps (e.g. walking into mall). Uses footsteps.mp3 from public/ if present.
 * Call stopFootsteps() when the walk ends (e.g. when NFT phase starts).
 */
export function playFootsteps(): void {
  try {
    stopFootsteps()
    const audio = new Audio(FOOTSTEPS_URL)
    footstepsAudio = audio
    audio.loop = false
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch {}
}

export function stopFootsteps(): void {
  try {
    if (footstepsAudio) {
      footstepsAudio.pause()
      footstepsAudio.currentTime = 0
      footstepsAudio = null
    }
  } catch {}
}

/** Play wind reveal sound when NFT appears (60% volume). */
export function playMovieReveal(): void {
  try {
    const audio = new Audio(WIND_URL)
    audio.volume = 0.6
    audio.play().catch(() => {})
  } catch {}
}

