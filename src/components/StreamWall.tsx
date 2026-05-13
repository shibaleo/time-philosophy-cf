import { useEffect, useMemo, useRef } from 'react'

type Props = {
  className?: string
}

// Two side-by-side lanes. Dots stream from the left, jostling each other as
// they advance, halted by an invisible wall on the right, accumulating against
// it, and either fading in place or slipping away vertically and fading.
//   |▶|  |▶|
export function StreamWall({ className }: Props) {
  // doubled lanes, gap reduced to 2/3, with horizontal padding so the left
  // lane's spawn line sits comfortably inside the card.
  const laneWidth = 200
  const gap = Math.round(320 * (1 / 3)) // 107 — half of the previous gap
  const sidePad = 16 // breathing space at each end of the canvas
  const w = sidePad * 2 + laneWidth * 2 + gap // 539
  const h = 240
  const cell = 16
  const radius = 4.5

  type Lane = {
    laneLeft: number
    spawnMin: number
    spawnMax: number
    wallX: number
  }
  // both lanes' spawn zones live entirely inside their own lane (and equal length),
  // shifted right by sidePad so the left spawn line stays inside the card
  const lane1Left = sidePad
  const lane2Left = sidePad + laneWidth + gap
  const spawnDepth = 60
  const lanes: Lane[] = [
    {
      laneLeft: lane1Left,
      spawnMin: lane1Left - 10,
      spawnMax: lane1Left + spawnDepth,
      wallX: lane1Left + laneWidth - 6,
    },
    {
      laneLeft: lane2Left,
      spawnMin: lane2Left - 10,
      spawnMax: lane2Left + spawnDepth,
      wallX: lane2Left + laneWidth - 6,
    },
  ]
  const fadeInLen = 130 // distance over which a new particle ramps to full opacity
  const maxOpacity = 0.85

  const perLane = 70
  const count = lanes.length * perLane
  const minSep = cell + 2

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  useEffect(() => {
    type P = {
      lane: number
      x: number
      y: number
      vx: number
      vy: number
      opacity: number
      state: 'flow' | 'stop' | 'escape' | 'fade'
      stopTimer: number
      stopDuration: number
      jitterSeed: number
    }

    const spawn = (p: P, initial = false) => {
      const lane = lanes[p.lane]
      const range = lane.spawnMax - lane.spawnMin
      p.x = initial
        ? lane.spawnMin - Math.random() * (lane.wallX - lane.spawnMin)
        : lane.spawnMin - Math.random() * range
      p.y = 16 + Math.random() * (h - 32)
      p.vx = 0.5 + Math.random() * 0.9
      p.vy = 0
      p.opacity = 0
      p.state = 'flow'
      p.stopTimer = 0
      p.stopDuration = 600 + Math.random() * 900
      p.jitterSeed = Math.random() * 10
    }

    const ps: P[] = []
    for (let i = 0; i < count; i++) {
      const p: P = {
        lane: Math.floor(i / perLane),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        opacity: 0,
        state: 'flow',
        stopTimer: 0,
        stopDuration: 0,
        jitterSeed: 0,
      }
      spawn(p, true)
      ps.push(p)
    }

    let raf = 0
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min(50, t - last)
      last = t
      const step = dt / 16

      // 1. integrate motion
      for (let i = 0; i < count; i++) {
        const p = ps[i]
        const wallX = lanes[p.lane].wallX

        if (p.state === 'flow') {
          p.x += p.vx * step
          const xFromLeft = p.x - lanes[p.lane].laneLeft
          const ratio = Math.max(0, Math.min(1, xFromLeft / fadeInLen))
          // ease-in so the leftmost edge is extra soft
          p.opacity = maxOpacity * ratio * ratio
          if (p.x >= wallX - cell / 2) {
            p.x = wallX - cell / 2
            p.state = 'stop'
            p.stopTimer = 0
          }
        } else if (p.state === 'stop') {
          p.stopTimer += dt
          if (p.stopTimer > p.stopDuration) {
            if (Math.random() < 0.6) {
              p.state = 'escape'
              const dir = Math.random() < 0.5 ? -1 : 1
              p.vy = dir * (0.8 + Math.random() * 0.8)
              p.vx = -0.15 - Math.random() * 0.15
            } else {
              p.state = 'fade'
            }
          }
        } else if (p.state === 'escape') {
          p.x += p.vx * step
          p.y += p.vy * step
          p.opacity -= 0.018 * step
          if (p.opacity <= 0 || p.y < -cell || p.y > h + cell) spawn(p)
        } else {
          p.opacity -= 0.035 * step
          if (p.opacity <= 0) spawn(p)
        }
      }

      // 2. pairwise collision resolution within the same lane
      //    stopped/escaping particles act as immovable for flow particles in x
      const iterations = 3
      for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < count; i++) {
          const a = ps[i]
          if (a.opacity < 0.05) continue
          for (let j = i + 1; j < count; j++) {
            const b = ps[j]
            if (b.lane !== a.lane) continue
            if (b.opacity < 0.05) continue
            const dx = b.x - a.x
            const dy = b.y - a.y
            const dist = Math.hypot(dx, dy) || 0.0001
            if (dist >= minSep) continue

            const overlap = minSep - dist
            const nx = dx / dist
            const ny = dy / dist

            // movability per state — stopped is heavy
            const wa = a.state === 'stop' ? 0.1 : 1
            const wb = b.state === 'stop' ? 0.1 : 1
            const sum = wa + wb
            const pushA = overlap * (wa / sum)
            const pushB = overlap * (wb / sum)

            a.x -= nx * pushA
            a.y -= ny * pushA
            b.x += nx * pushB
            b.y += ny * pushB
          }
        }
      }

      // 3. flow particles that are jammed near the wall transition to stop
      for (let i = 0; i < count; i++) {
        const p = ps[i]
        if (p.state !== 'flow') continue
        const wallX = lanes[p.lane].wallX
        // look ahead in same lane for a near-wall stopped particle blocking us
        if (p.x >= wallX - cell / 2 - 2) {
          p.state = 'stop'
          p.stopTimer = 0
          continue
        }
        for (let j = 0; j < count; j++) {
          if (i === j) continue
          const q = ps[j]
          if (q.state !== 'stop') continue
          if (q.lane !== p.lane) continue
          if (Math.abs(q.y - p.y) > cell * 0.9) continue
          if (q.x > p.x && q.x - p.x < cell + 2) {
            p.state = 'stop'
            p.stopTimer = 0
            break
          }
        }
      }

      // 4. write transforms
      for (let i = 0; i < count; i++) {
        const p = ps[i]
        const r = rectRefs.current[i]
        if (!r) continue
        const jx =
          p.state === 'stop' ? Math.sin(t * 0.018 + p.jitterSeed) * 0.5 : 0
        const jy =
          p.state === 'stop' ? Math.cos(t * 0.022 + p.jitterSeed) * 0.4 : 0
        r.setAttribute('transform', `translate(${p.x + jx} ${p.y + jy})`)
        r.setAttribute('opacity', String(p.opacity))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `sw-grad-${uid}`
  const blurId = `sw-blur-${uid}`

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
