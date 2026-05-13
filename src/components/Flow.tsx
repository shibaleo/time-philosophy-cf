import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// A continuous horizontal stream — dots emerge from the right, drift left at
// varied speeds with gentle vertical wobble, fade as they leave the left edge.
// Time, constantly flowing away.
export function Flow({ className }: Props) {
  // canvas / display ratio chosen so a cell renders the same on-screen size
  // as the StreamWall scene (cell=16, viewBox≈539, displayed≈460).
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5
  const count = 80

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  useEffect(() => {
    const fadeLen = 130
    const maxOpacity = 0.75

    type P = {
      x: number
      y: number
      speed: number
      wobbleAmp: number
      wobbleSeed: number
      wobbleSpeed: number
      opacity: number
    }

    const spawn = (p: P, initial = false) => {
      p.x = initial
        ? -10 + Math.random() * (w + 30)
        : -10 - Math.random() * 80
      p.y = 12 + Math.random() * (h - 24)
      p.speed = 0.55 + Math.random() * 1.2
      p.wobbleAmp = 1.8 + Math.random() * 3.4
      p.wobbleSeed = Math.random() * 10
      p.wobbleSpeed = 0.0007 + Math.random() * 0.0012
      p.opacity = 0
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
        opacity: 0,
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

        p.x += p.speed * step

        // opacity ramp tied to x position — dense fade at both edges
        let ratio = 1
        if (p.x > w - fadeLen) ratio = (w - p.x) / fadeLen
        else if (p.x < fadeLen) ratio = p.x / fadeLen
        ratio = Math.max(0, Math.min(1, ratio))
        // ease-in/out so edges are extra soft
        const mod = qualityMod(p.x, p.y, now)
        p.opacity = maxOpacity * ratio * ratio * mod.opacityMul

        if (p.x > w + 20) spawn(p)

        const wob = Math.sin(now * p.wobbleSpeed + p.wobbleSeed) * p.wobbleAmp
        r.setAttribute(
          'transform',
          `translate(${p.x} ${p.y + wob}) scale(${mod.scaleMul})`,
        )
        r.setAttribute('opacity', String(p.opacity))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `fl-grad-${uid}`
  const blurId = `fl-blur-${uid}`

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
