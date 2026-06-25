import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Future Impact, mirroring Irreversible's accumulation logic forward in time:
// particles flow left → right and pass through. The moment each one crosses
// an invisible "present line", it leaves a fixed point in the future region
// (right side) at its current y, drifted slightly ahead of where it was.
// Particles keep flowing; the future region fills with the marks they made.
// What's there now shapes what will be there later.
export function Future({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const cellR = 4.5

  const presentX = 230
  const futureXMin = 305
  const futureXMax = 500
  const minSep = 18
  const totalSlots = 24

  const maxFlow = 60

  const flowRefs = useRef<(SVGRectElement | null)[]>([])
  const slotRefs = useRef<(SVGRectElement | null)[]>([])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const liveId = `fu-live-${uid}`
  const futureId = `fu-future-${uid}`
  const blurId = `fu-blur-${uid}`

  useEffect(() => {
    type Flow = {
      active: boolean
      x: number
      y: number
      vx: number
      opacity: number
      wobbleSeed: number
      wobbleAmp: number
      wobbleSpeed: number
      triggered: boolean
    }
    const flows: Flow[] = Array.from({ length: maxFlow }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      opacity: 0,
      wobbleSeed: 0,
      wobbleAmp: 0,
      wobbleSpeed: 0,
      triggered: false,
    }))

    type Slot = {
      active: boolean
      x: number
      y: number
      bornAt: number
      opacity: number
    }
    const slots: Slot[] = Array.from({ length: totalSlots }, () => ({
      active: false,
      x: 0,
      y: 0,
      bornAt: 0,
      opacity: 0,
    }))

    let phase: 'open' | 'hold' | 'fade' | 'pause' = 'open'
    let phaseStart = performance.now()
    let placedCount = 0
    let lastSpawn = -9999
    const spawnInterval = 110
    const slotFadeInDur = 280
    const holdDur = 700
    const fadeDur = 500
    const pauseDur = 500

    const resetCycle = (now: number) => {
      phase = 'open'
      phaseStart = now
      placedCount = 0
      for (const s of slots) {
        s.active = false
        s.opacity = 0
      }
    }

    const spawnFlow = () => {
      const f = flows.find((x) => !x.active)
      if (!f) return
      f.active = true
      f.x = -12
      f.y = 22 + Math.random() * (h - 44)
      f.vx = 1.4 + Math.random() * 0.7
      f.opacity = 0
      f.wobbleSeed = Math.random() * 10
      f.wobbleAmp = 1.0 + Math.random() * 2.0
      f.wobbleSpeed = 0.0007 + Math.random() * 0.0012
      f.triggered = false
    }

    const tryPlaceSlot = (y: number, now: number) => {
      if (placedCount >= totalSlots) return
      // try several candidate x's, pick first that doesn't overlap an existing slot
      for (let attempt = 0; attempt < 8; attempt++) {
        const x = futureXMin + Math.random() * (futureXMax - futureXMin)
        let ok = true
        for (const s of slots) {
          if (!s.active) continue
          if (Math.hypot(s.x - x, s.y - y) < minSep) {
            ok = false
            break
          }
        }
        if (ok) {
          const slot = slots[placedCount]
          slot.active = true
          slot.x = x
          slot.y = y
          slot.bornAt = now
          slot.opacity = 0
          placedCount++
          return
        }
      }
      // all attempts blocked — this moment didn't leave a mark
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      if (now - lastSpawn >= spawnInterval) {
        spawnFlow()
        lastSpawn = now
      }

      // flowing particles
      for (let i = 0; i < flows.length; i++) {
        const f = flows[i]
        const r = flowRefs.current[i]
        if (!f.active) {
          if (r) r.setAttribute('opacity', '0')
          continue
        }
        f.x += f.vx * step
        const wob = Math.sin(now * f.wobbleSpeed + f.wobbleSeed) * f.wobbleAmp
        const renderY = f.y + wob

        // trigger at the present line — particle keeps flowing
        if (
          !f.triggered &&
          phase === 'open' &&
          f.x >= presentX
        ) {
          f.triggered = true
          tryPlaceSlot(renderY, now)
        }

        // fade in / out
        let fadeIn = Math.min(1, (f.x + 12) / 40)
        fadeIn = fadeIn * fadeIn
        let edgeR = 1
        if (f.x > w - 70) edgeR = (w - f.x) / 70
        edgeR = Math.max(0, Math.min(1, edgeR))
        f.opacity = 0.78 * fadeIn * edgeR * edgeR

        if (f.x > w + 30) {
          f.active = false
          if (r) r.setAttribute('opacity', '0')
          continue
        }

        if (r) {
          const mod = qualityMod(f.x, renderY, now)
          r.setAttribute(
            'transform',
            `translate(${f.x} ${renderY}) scale(${mod.scaleMul})`,
          )
          r.setAttribute('opacity', String(f.opacity * mod.opacityMul))
        }
      }

      // future slots
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i]
        const r = slotRefs.current[i]
        if (!r) continue
        if (!s.active) {
          r.setAttribute('opacity', '0')
          continue
        }
        const age = now - s.bornAt
        const fadeInK = Math.min(1, age / slotFadeInDur)
        const eased = 1 - Math.pow(1 - fadeInK, 2)
        let alpha = 0.78 * eased
        if (phase === 'fade') {
          const k = Math.min(1, (now - phaseStart) / fadeDur)
          alpha *= 1 - k
        } else if (phase === 'pause') {
          alpha = 0
        }
        r.setAttribute('transform', `translate(${s.x} ${s.y})`)
        r.setAttribute('opacity', String(alpha))
      }

      // phase transitions
      if (phase === 'open' && placedCount >= totalSlots) {
        phase = 'hold'
        phaseStart = now
      } else if (phase === 'hold' && now - phaseStart >= holdDur) {
        phase = 'fade'
        phaseStart = now
      } else if (phase === 'fade' && now - phaseStart >= fadeDur) {
        phase = 'pause'
        phaseStart = now
      } else if (phase === 'pause' && now - phaseStart >= pauseDur) {
        resetCycle(now)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={liveId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={futureId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.4" />
        </linearGradient>
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {/* future slots */}
        {Array.from({ length: totalSlots }).map((_, i) => (
          <rect
            key={`slot-${i}`}
            ref={(el) => {
              slotRefs.current[i] = el
            }}
            x={-cell / 2}
            y={-cell / 2}
            width={cell}
            height={cell}
            rx={cellR}
            ry={cellR}
            fill={`url(#${futureId})`}
            opacity={0}
          />
        ))}
        {/* flowing particles */}
        {Array.from({ length: maxFlow }).map((_, i) => (
          <rect
            key={`flow-${i}`}
            ref={(el) => {
              flowRefs.current[i] = el
            }}
            x={-cell / 2}
            y={-cell / 2}
            width={cell}
            height={cell}
            rx={cellR}
            ry={cellR}
            fill={`url(#${liveId})`}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  )
}
