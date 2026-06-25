import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Particles flow in from the left, drifting rightward past the already-locked
// pile, and snap into the next empty slot. Once locked, they desaturate and
// never move again — the past, written down. The grid fills left → right,
// column by column; each new arrival overtakes the prior column in its row.
export function Irreversible({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5

  const cols = 10
  const rows = 7
  const pitch = 28
  const gridH = (rows - 1) * pitch
  const gridX = 28
  const gridY = (h - gridH) / 2
  const totalSlots = cols * rows

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const liveId = `ir-live-${uid}`
  const pastId = `ir-past-${uid}`
  const blurId = `ir-blur-${uid}`

  useEffect(() => {
    type Slot = { x: number; y: number; col: number }
    const slots: Slot[] = []
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        slots.push({ x: gridX + c * pitch, y: gridY + r * pitch, col: c })
      }
    }

    // produce a fill order biased toward leftward columns but with randomness
    // — a slot's priority is its column index plus uniform noise that spans
    // roughly two columns, so order is jumbled within a sliding window.
    const buildFillOrder = (): Slot[] => {
      const spread = 2.2
      return [...slots]
        .map((s) => ({ s, key: s.col + Math.random() * spread }))
        .sort((a, b) => a.key - b.key)
        .map((o) => o.s)
    }
    let fillOrder = buildFillOrder()

    type P = {
      active: boolean
      state: 'flying' | 'locked'
      x: number
      y: number
      vx: number
      target: Slot
      opacity: number
      wobbleSeed: number
      wobbleAmp: number
    }

    const ps: P[] = Array.from({ length: totalSlots }, () => ({
      active: false,
      state: 'flying',
      x: 0,
      y: 0,
      vx: 0,
      target: slots[0],
      opacity: 0,
      wobbleSeed: 0,
      wobbleAmp: 0,
    }))

    let phase: 'filling' | 'hold' | 'fade' | 'pause' = 'filling'
    let phaseStart = performance.now()
    let lastSpawn = -9999
    let nextSlotIndex = 0
    let nextParticleIndex = 0
    const spawnInterval = 90
    const holdDuration = 1400
    const fadeDuration = 650
    const pauseDuration = 700

    const reset = () => {
      phase = 'filling'
      phaseStart = performance.now()
      lastSpawn = -9999
      nextSlotIndex = 0
      nextParticleIndex = 0
      fillOrder = buildFillOrder()
      for (const p of ps) {
        p.active = false
        p.opacity = 0
        p.state = 'flying'
      }
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      // spawn
      if (
        phase === 'filling' &&
        nextSlotIndex < totalSlots &&
        now - lastSpawn >= spawnInterval
      ) {
        const slot = fillOrder[nextSlotIndex]
        const p = ps[nextParticleIndex]
        p.active = true
        p.state = 'flying'
        p.target = slot
        p.x = -24
        p.y = slot.y + (Math.random() - 0.5) * 10
        p.vx = 3.6 + Math.random() * 2.0
        p.opacity = 0
        p.wobbleSeed = Math.random() * 10
        p.wobbleAmp = 2.5 + Math.random() * 2.5
        nextSlotIndex++
        nextParticleIndex++
        lastSpawn = now
      }

      let anyFlying = false

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const r = rectRefs.current[i]
        if (!p.active) {
          if (r) r.setAttribute('opacity', '0')
          continue
        }

        if (p.state === 'flying') {
          anyFlying = true
          p.x += p.vx * step
          p.y += (p.target.y - p.y) * 0.08 * step
          if (p.opacity < 0.75) p.opacity = Math.min(0.75, p.opacity + 0.05 * step)
          const distRatio = Math.max(0, Math.min(1, (p.target.x - p.x) / 200))
          const wob = Math.sin(now * 0.006 + p.wobbleSeed) * p.wobbleAmp * distRatio
          if (p.x >= p.target.x) {
            p.x = p.target.x
            p.y = p.target.y
            p.state = 'locked'
            if (r) {
              r.setAttribute('transform', `translate(${p.x} ${p.y})`)
              r.setAttribute('opacity', '0.55')
              r.setAttribute('fill', `url(#${pastId})`)
            }
            continue
          }
          if (r) {
            const mod = qualityMod(p.x, p.y, now)
            r.setAttribute(
              'transform',
              `translate(${p.x} ${p.y + wob}) scale(${mod.scaleMul})`,
            )
            r.setAttribute('opacity', String(p.opacity * mod.opacityMul))
            r.setAttribute('fill', `url(#${liveId})`)
          }
        } else {
          // locked — stays put forever (until cycle reset)
          if (phase === 'fade') {
            const k = Math.min(1, (now - phaseStart) / fadeDuration)
            if (r) r.setAttribute('opacity', String(0.55 * (1 - k)))
          }
        }
      }

      // phase transitions
      if (phase === 'filling' && nextSlotIndex >= totalSlots && !anyFlying) {
        phase = 'hold'
        phaseStart = now
      } else if (phase === 'hold' && now - phaseStart >= holdDuration) {
        phase = 'fade'
        phaseStart = now
      } else if (phase === 'fade' && now - phaseStart >= fadeDuration) {
        phase = 'pause'
        phaseStart = now
      } else if (phase === 'pause' && now - phaseStart >= pauseDuration) {
        reset()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [liveId, pastId])

  return (
    <svg
      ref={svgRef}
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
        <linearGradient id={pastId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa6b2" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#aeb6bd" stopOpacity="0.42" />
        </linearGradient>
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {Array.from({ length: totalSlots }).map((_, i) => (
          <rect
            key={i}
            ref={(el) => {
              rectRefs.current[i] = el
            }}
            x={-cell / 2}
            y={-cell / 2}
            width={cell}
            height={cell}
            rx={radius}
            ry={radius}
            fill={`url(#${liveId})`}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  )
}
