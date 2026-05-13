import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Three thin parallel lanes flow left → right, each carrying particles of a
// different tint: warm (top), default azure (middle), cool green (bottom).
// Same shape, same motion, but the tint is intrinsic to the lane — one
// stream's time cannot be exchanged for another's.
export function Nonsubstitutable({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 14
  const radius = 4

  // lanes (top → bottom): warm / default / cool
  const lanes = [
    { y0: 22, y1: 72, gradFrom: '#e8c878', gradTo: '#efd8a0' },
    { y0: 95, y1: 145, gradFrom: '#9ec5ff', gradTo: '#a8e0d8' },
    { y0: 168, y1: 218, gradFrom: '#8ed3b0', gradTo: '#b6e6cc' },
  ] as const

  const perLane = 30
  const totalCount = lanes.length * perLane

  const rectRefs = useRef<(SVGRectElement | null)[]>([])
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const blurId = `ns-blur-${uid}`

  useEffect(() => {
    const fadeLen = 130
    const maxOpacity = 0.72

    type P = {
      lane: number
      x: number
      y: number
      speed: number
      wobbleAmp: number
      wobbleSeed: number
      wobbleSpeed: number
      opacity: number
    }

    const spawn = (p: P, initial = false) => {
      const lane = lanes[p.lane]
      p.x = initial
        ? -10 + Math.random() * (w + 30)
        : -10 - Math.random() * 80
      p.y = lane.y0 + 6 + Math.random() * (lane.y1 - lane.y0 - 12)
      p.speed = 0.5 + Math.random() * 1.1
      p.wobbleAmp = 1.0 + Math.random() * 2.2
      p.wobbleSeed = Math.random() * 10
      p.wobbleSpeed = 0.0007 + Math.random() * 0.0012
      p.opacity = 0
    }

    const ps: P[] = []
    for (let li = 0; li < lanes.length; li++) {
      for (let i = 0; i < perLane; i++) {
        const p: P = {
          lane: li,
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
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      for (let i = 0; i < totalCount; i++) {
        const p = ps[i]
        const r = rectRefs.current[i]
        if (!r) continue

        p.x += p.speed * step

        let ratio = 1
        if (p.x > w - fadeLen) ratio = (w - p.x) / fadeLen
        else if (p.x < fadeLen) ratio = p.x / fadeLen
        ratio = Math.max(0, Math.min(1, ratio))

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
        {lanes.map((l, li) => (
          <linearGradient
            key={li}
            id={`ns-grad-${uid}-${li}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={l.gradFrom} stopOpacity="0.7" />
            <stop offset="100%" stopColor={l.gradTo} stopOpacity="0.5" />
          </linearGradient>
        ))}
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {Array.from({ length: totalCount }).map((_, i) => {
          const laneIdx = Math.floor(i / perLane)
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
              rx={radius}
              ry={radius}
              fill={`url(#ns-grad-${uid}-${laneIdx})`}
              opacity={0}
            />
          )
        })}
      </g>
    </svg>
  )
}
