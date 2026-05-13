import { useEffect, useMemo, useRef } from 'react'
import { qualityField } from './qualityField'

type Props = {
  className?: string
}

// A horizontal stream like Flow, but the particles' brightness is modulated
// by a slow-drifting two-dimensional quality field — bands of "rich" and
// "thin" time slide across the canvas. Sizes vary only slightly so the focus
// stays on luminance rather than shape.
export function Heterogeneous({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5
  const count = 95

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  useEffect(() => {
    const fadeLen = 130
    const maxOpacity = 0.78

    type P = {
      x: number
      y: number
      speed: number
      wobbleAmp: number
      wobbleSeed: number
      wobbleSpeed: number
      baseScale: number
      jitter: number
    }

    const spawn = (p: P, initial = false, now = performance.now()) => {
      p.x = initial
        ? -10 + Math.random() * (w + 30)
        : -10 - Math.random() * 80
      // best-of-N y sampling: draw many candidate ys at a reference x and
      // pick the one with the highest field value, so spawns concentrate
      // sharply on current high-quality bands.
      const sampleX = initial ? p.x : 30
      let bestY = 12 + Math.random() * (h - 24)
      let bestQ = -1
      for (let tries = 0; tries < 18; tries++) {
        const y = 12 + Math.random() * (h - 24)
        const q = qualityField(sampleX, y, now)
        if (q > bestQ) {
          bestQ = q
          bestY = y
        }
      }
      p.y = bestY
      p.speed = 0.45 + Math.random() * 1.25
      p.wobbleAmp = 0.8 + Math.random() * 1.6
      p.wobbleSeed = Math.random() * 10
      p.wobbleSpeed = 0.0007 + Math.random() * 0.0012
      p.baseScale = 0.92 + Math.random() * 0.16
      p.jitter = 0.8 + Math.random() * 0.4
    }

    const ps: P[] = []
    for (let i = 0; i < count; i++) {
      const p: P = {
        x: 0,
        y: 0,
        speed: 0,
        wobbleAmp: 0,
        wobbleSeed: 0,
        wobbleSpeed: 0,
        baseScale: 1,
        jitter: 1,
      }
      spawn(p, true)
      ps.push(p)
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      for (let i = 0; i < count; i++) {
        const p = ps[i]
        const r = rectRefs.current[i]
        if (!r) continue

        // sample local field
        const qHere = qualityField(p.x, p.y, now)
        // slow down in high-quality regions → particles pile up horizontally
        // into clumps; speed up in thin regions so they hurry through
        const speedMul = 0.25 + 1.5 * Math.pow(1 - qHere, 1.4)
        p.x += p.speed * speedMul * step

        // gradient ascent in y so clumps stay tight to the band
        const eps = 6
        const qUp = qualityField(p.x, p.y - eps, now)
        const qDown = qualityField(p.x, p.y + eps, now)
        p.y += (qDown - qUp) * 2.2 * step
        if (p.y < 12) p.y = 12
        else if (p.y > h - 12) p.y = h - 12

        let edgeRatio = 1
        if (p.x > w - fadeLen) edgeRatio = (w - p.x) / fadeLen
        else if (p.x < fadeLen) edgeRatio = p.x / fadeLen
        edgeRatio = Math.max(0, Math.min(1, edgeRatio))

        // heterogeneity here is expressed by clustering (spawn-y rejection
        // sampling), not by per-particle size/luminance modulation — keep the
        // particles uniform so density reads as the variable.
        const opacity = maxOpacity * edgeRatio * edgeRatio * p.jitter
        const scale = p.baseScale

        if (p.x > w + 20) spawn(p, false, now)

        const wob = Math.sin(now * p.wobbleSpeed + p.wobbleSeed) * p.wobbleAmp
        r.setAttribute(
          'transform',
          `translate(${p.x} ${p.y + wob}) scale(${scale})`,
        )
        r.setAttribute('opacity', String(opacity))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `ht-grad-${uid}`
  const blurId = `ht-blur-${uid}`

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
        {Array.from({ length: count }).map((_, i) => (
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
