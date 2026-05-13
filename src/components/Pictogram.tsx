import { useEffect, useMemo, useRef } from 'react'

type Props = {
  pattern: string[]
  className?: string
}

// '█' = filled cell, anything else = empty
export function Pictogram({ pattern, className }: Props) {
  const cell = 12
  const radius = 3.5
  const stride = 19
  const pad = 26

  const cols = Math.max(...pattern.map((r) => r.length))
  const rows = pattern.length

  const w = (cols - 1) * stride + pad * 2
  const h = (rows - 1) * stride + pad * 2

  const homes = useMemo(() => {
    const out: { x: number; y: number }[] = []
    pattern.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '█') {
          out.push({ x: pad + x * stride, y: pad + y * stride })
        }
      }
    })
    return out
  }, [pattern])

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  // motion state (mutable, raf-driven)
  const stateRef = useRef<{
    pos: { x: number; y: number }[]
    vel: { x: number; y: number }[]
    mouse: { x: number; y: number; inside: boolean }
    dragging: number | null
    grabRadius: number
  }>({
    pos: homes.map((p) => ({ ...p })),
    vel: homes.map(() => ({ x: 0, y: 0 })),
    mouse: { x: 0, y: 0, inside: false },
    dragging: null,
    grabRadius: stride * 0.9,
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    // ripple params
    const ringWidth = stride * 1.4
    const radiusOfEffect = stride * 5
    const amplitude = 4
    const speed = 0.0055
    const ringPhase = 1.1

    // spring params
    const stiffness = 0.22
    const damping = 0.72

    let raf = 0
    const s = stateRef.current

    const tick = (t: number) => {
      const { x: mx, y: my, inside } = s.mouse
      for (let i = 0; i < homes.length; i++) {
        const r = rectRefs.current[i]
        if (!r) continue
        const home = homes[i]
        const pos = s.pos[i]
        const vel = s.vel[i]

        // pick target
        let tx = home.x
        let ty = home.y

        if (s.dragging === i) {
          tx = mx
          ty = my
        } else if (inside && s.dragging === null) {
          const dx = home.x - mx
          const dy = home.y - my
          const dist = Math.hypot(dx, dy)
          if (dist <= radiusOfEffect) {
            const ring = Math.floor(dist / ringWidth)
            const falloff = 1 - dist / radiusOfEffect
            const phase = t * speed - ring * ringPhase
            const inv = dist > 0.001 ? 1 / dist : 0
            const wave = Math.sin(phase) * amplitude * falloff
            tx = home.x + dx * inv * wave
            ty = home.y + dy * inv * wave
          }
        }

        // critically damped-ish spring
        const ax = (tx - pos.x) * stiffness
        const ay = (ty - pos.y) * stiffness
        vel.x = (vel.x + ax) * damping
        vel.y = (vel.y + ay) * damping
        pos.x += vel.x
        pos.y += vel.y

        r.setAttribute('transform', `translate(${pos.x} ${pos.y})`)
      }
      raf = requestAnimationFrame(tick)
    }

    const toLocal = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) * w) / rect.width,
        y: ((e.clientY - rect.top) * h) / rect.height,
      }
    }

    const findNearest = (x: number, y: number) => {
      let best = -1
      let bestDist = s.grabRadius
      for (let i = 0; i < homes.length; i++) {
        const d = Math.hypot(s.pos[i].x - x, s.pos[i].y - y)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      return best
    }

    const onDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e)
      s.mouse.x = x
      s.mouse.y = y
      s.mouse.inside = true
      const idx = findNearest(x, y)
      if (idx >= 0) {
        s.dragging = idx
        svg.setPointerCapture(e.pointerId)
        svg.style.cursor = 'grabbing'
        e.preventDefault()
      }
    }
    const onMove = (e: PointerEvent) => {
      const { x, y } = toLocal(e)
      s.mouse.x = x
      s.mouse.y = y
      s.mouse.inside = true
      if (s.dragging === null) {
        // hover cursor hint when close to a dot
        const near = findNearest(x, y)
        svg.style.cursor = near >= 0 ? 'grab' : 'default'
      }
    }
    const onUp = (e: PointerEvent) => {
      if (s.dragging !== null) {
        s.dragging = null
        svg.releasePointerCapture(e.pointerId)
        svg.style.cursor = 'grab'
      }
    }
    const onLeave = () => {
      s.mouse.inside = false
      if (s.dragging === null) svg.style.cursor = 'default'
    }

    svg.addEventListener('pointerdown', onDown)
    svg.addEventListener('pointermove', onMove)
    svg.addEventListener('pointerup', onUp)
    svg.addEventListener('pointercancel', onUp)
    svg.addEventListener('pointerleave', onLeave)
    svg.style.touchAction = 'none'

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      svg.removeEventListener('pointerdown', onDown)
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerup', onUp)
      svg.removeEventListener('pointercancel', onUp)
      svg.removeEventListener('pointerleave', onLeave)
    }
  }, [homes, w, h])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `pg-grad-${uid}`
  const blurId = `pg-blur-${uid}`

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.45" />
        </linearGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <g filter={`url(#${blurId})`}>
        {homes.map((c, i) => (
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
            transform={`translate(${c.x} ${c.y})`}
          />
        ))}
      </g>
    </svg>
  )
}
