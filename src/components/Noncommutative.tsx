import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// A single diagonal of fixed slot coordinates (\\ shape). N particles flow in
// from the left and lock into the slots in arrival order, each carrying an
// intrinsic vertical offset tied to its identity. Cycles alternate between an
// ordered run (identity order matches slot order → clean diagonal) and a
// shuffled run (same particles arrive in a different order → diagonal arrives
// jagged). Same material, only the sequence differs; the outcome differs.
export function Noncommutative({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5

  const N = 10
  const slotPitch = 36
  const slotSlope = 14 // y increment per slot — sets the \ angle
  const gridX = 110 // first slot x
  const laneY = 50 // top-left of the diagonal
  const heightAmp = 16

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `nc-grad-${uid}`
  const blurId = `nc-blur-${uid}`

  useEffect(() => {
    type P = {
      active: boolean
      state: 'flying' | 'locked'
      x: number
      y: number
      vx: number
      targetX: number
      targetY: number
      opacity: number
      wobbleSeed: number
      wobbleAmp: number
    }

    const ps: P[] = Array.from({ length: N }, () => ({
      active: false,
      state: 'flying',
      x: 0,
      y: 0,
      vx: 0,
      targetX: 0,
      targetY: 0,
      opacity: 0,
      wobbleSeed: 0,
      wobbleAmp: 0,
    }))

    const intrinsicOffset = (id: number) =>
      -heightAmp + (id / (N - 1)) * 2 * heightAmp

    const currentSeq = Array.from({ length: N }, (_, i) => i)

    let phase: 'filling' | 'hold' | 'fade' | 'pause' = 'filling'
    let phaseStart = performance.now()
    let lastSpawn = -9999
    let nextStep = 0
    const spawnInterval = 260
    const holdDuration = 700
    const fadeDuration = 380
    const pauseDuration = 250

    const reset = () => {
      phase = 'filling'
      phaseStart = performance.now()
      lastSpawn = -9999
      nextStep = 0
      for (const p of ps) {
        p.active = false
        p.opacity = 0
        p.state = 'flying'
      }
    }

    const spawnAt = (
      p: P,
      laneBaseY: number,
      identity: number,
      slotIndex: number,
    ) => {
      const slotX = gridX + slotIndex * slotPitch
      const slotY = laneBaseY + slotIndex * slotSlope
      const finalY = slotY + intrinsicOffset(identity)
      p.active = true
      p.state = 'flying'
      p.x = -22
      p.y = finalY
      p.targetX = slotX
      p.targetY = finalY
      p.vx = 3.0 + Math.random() * 1.0
      p.opacity = 0
      p.wobbleSeed = Math.random() * 10
      p.wobbleAmp = 1.4 + Math.random() * 1.4
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      if (
        phase === 'filling' &&
        nextStep < N &&
        now - lastSpawn >= spawnInterval
      ) {
        spawnAt(ps[nextStep], laneY, currentSeq[nextStep], nextStep)
        nextStep++
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
          if (p.opacity < 0.78) p.opacity = Math.min(0.78, p.opacity + 0.05 * step)
          const distRatio = Math.max(
            0,
            Math.min(1, (p.targetX - p.x) / 200),
          )
          const wob =
            Math.sin(now * 0.006 + p.wobbleSeed) * p.wobbleAmp * distRatio
          if (p.x >= p.targetX) {
            p.x = p.targetX
            p.y = p.targetY
            p.state = 'locked'
            if (r) {
              r.setAttribute('transform', `translate(${p.x} ${p.y})`)
              r.setAttribute('opacity', '0.78')
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
          }
        } else {
          if (phase === 'fade') {
            const k = Math.min(1, (now - phaseStart) / fadeDuration)
            if (r) r.setAttribute('opacity', String(0.78 * (1 - k)))
          }
        }
      }

      if (phase === 'filling' && nextStep >= N && !anyFlying) {
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
  }, [])

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
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.45" />
        </linearGradient>
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {Array.from({ length: N }).map((_, i) => (
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
            fill={`url(#${gradId})`}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  )
}
