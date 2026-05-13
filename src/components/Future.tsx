import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Future Impact: each particle casts a long, fading shadow ahead of itself
// into the right side of the canvas (the "future"). The shadow is the
// particle's influence reaching forward in time — what's happening now is
// already present, faintly, in what comes next.
export function Future({ className }: Props) {
  const w = 540
  const h = 240
  const headCell = 14
  const headRadius = 4
  const tailCell = 11
  const tailRadius = 3.5

  const maxParticles = 10
  const tailLength = 16
  const tailSpacing = 14

  const rectRefs = useRef<(SVGRectElement | null)[]>([])
  const slotSize = 1 + tailLength

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `fu-grad-${uid}`
  const blurId = `fu-blur-${uid}`

  useEffect(() => {
    type P = {
      active: boolean
      x: number
      y: number
      vx: number
      vy: number
      bornAt: number
      wobbleSeed: number
      wobbleSpeed: number
    }

    const ps: P[] = Array.from({ length: maxParticles }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      bornAt: 0,
      wobbleSeed: 0,
      wobbleSpeed: 0,
    }))

    const spawnInterval = 540
    let lastSpawn = -9999

    const spawn = (now: number) => {
      const p = ps.find((x) => !x.active)
      if (!p) return
      p.active = true
      p.x = -10
      p.y = 28 + Math.random() * (h - 56)
      p.vx = 1.3 + Math.random() * 0.6
      p.vy = (Math.random() - 0.5) * 0.18
      p.bornAt = now
      p.wobbleSeed = Math.random() * 10
      p.wobbleSpeed = 0.0008 + Math.random() * 0.001
    }

    const fadeInDur = 320
    const headMaxOp = 0.78
    const tailMaxOp = 0.42

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      if (now - lastSpawn >= spawnInterval) {
        spawn(now)
        lastSpawn = now
      }

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const baseIdx = i * slotSize

        // hide all rects for inactive particles
        if (!p.active) {
          for (let k = 0; k < slotSize; k++) {
            const r = rectRefs.current[baseIdx + k]
            if (r) r.setAttribute('opacity', '0')
          }
          continue
        }

        p.x += p.vx * step
        p.y += p.vy * step
        p.vy *= 0.99

        // shared age & edge factors
        const age = now - p.bornAt
        const fadeInK = Math.min(1, age / fadeInDur)
        const fadeIn = 1 - Math.pow(1 - fadeInK, 2)

        const fadeLen = 110
        const edgeFade = (x: number) => {
          let v = 1
          if (x > w - fadeLen) v = (w - x) / fadeLen
          if (x < -10) v = 0
          v = Math.max(0, Math.min(1, v))
          return v * v
        }

        // head
        const headEdge = edgeFade(p.x)
        const headMod = qualityMod(p.x, p.y, now)
        const headOp = headMaxOp * fadeIn * headEdge * headMod.opacityMul
        const headR = rectRefs.current[baseIdx]
        if (headR) {
          headR.setAttribute(
            'transform',
            `translate(${p.x} ${p.y}) scale(${headMod.scaleMul})`,
          )
          headR.setAttribute('opacity', String(headOp))
        }

        // tail — fading dots stretching to the right
        for (let k = 1; k <= tailLength; k++) {
          const tx = p.x + k * tailSpacing
          // gentle wave that travels along the tail
          const ty =
            p.y +
            Math.sin(now * p.wobbleSpeed + p.wobbleSeed + k * 0.35) *
              (1.0 + k * 0.15)
          const along = k / tailLength
          // fade more aggressively toward the far end, plus right-edge fade
          const lifeFade = Math.pow(1 - along, 1.4)
          const tailEdge = edgeFade(tx)
          const tailMod = qualityMod(tx, ty, now)
          const op =
            tailMaxOp * fadeIn * lifeFade * tailEdge * tailMod.opacityMul

          const r = rectRefs.current[baseIdx + k]
          if (!r) continue
          // tail dots shrink slightly along the trail
          const scale = (1 - along * 0.35) * tailMod.scaleMul
          r.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`)
          r.setAttribute('opacity', String(op))
        }

        // recycle when head fully past the right edge
        if (p.x > w + 20) {
          p.active = false
          for (let k = 0; k < slotSize; k++) {
            const r = rectRefs.current[baseIdx + k]
            if (r) r.setAttribute('opacity', '0')
          }
        }
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
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.45" />
        </linearGradient>
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {Array.from({ length: maxParticles * slotSize }).map((_, i) => {
          const isHead = i % slotSize === 0
          const cell = isHead ? headCell : tailCell
          const rx = isHead ? headRadius : tailRadius
          return (
            <rect
              key={i}
              ref={(el) => {
                rectRefs.current[i] = el
              }}
              x={-cell / 2}
              y={-cell / 2}
              width={cell}
              height={cell}
              rx={rx}
              ry={rx}
              fill={`url(#${gradId})`}
              opacity={0}
            />
          )
        })}
      </g>
    </svg>
  )
}
