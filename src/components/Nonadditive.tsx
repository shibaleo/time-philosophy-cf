import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Non-additivity: 1 + 1 + 1 + 1 ≠ 4.
// A cluster of bigger particles sits in the top-right (the "lump" / 塊).
// Particles flow in from the left and meet one of three fates at random:
//   merge — absorbed into the lump; the lump grows
//   bounce — grazes the lump and is deflected down into the scattered pile
//   fall — drops directly into the scattered pile at bottom-right
// Same material, same number; how they combine decides the result.
export function Nonadditive({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5

  // single big lump particle in top-right, equivalent area to ~12 cells
  const poolHome = [{ x: 440, y: 78, baseSize: 56 }] as const
  const poolCount = poolHome.length

  // scattered pile in bottom-right — random placement (no grid)
  const totalPile = 18
  const pileBox = { x0: 270, x1: 520, y0: 150, y1: 226 }
  const pileMinSep = 20
  const pileSlots = useMemo(() => {
    const out: { x: number; y: number }[] = []
    let attempts = 0
    while (out.length < totalPile && attempts < 2000) {
      attempts++
      const x = pileBox.x0 + Math.random() * (pileBox.x1 - pileBox.x0)
      const y = pileBox.y0 + Math.random() * (pileBox.y1 - pileBox.y0)
      let ok = true
      for (const q of out) {
        if (Math.hypot(q.x - x, q.y - y) < pileMinSep) {
          ok = false
          break
        }
      }
      if (ok) out.push({ x, y })
    }
    return out
  }, [])

  // pool of flying particles (one is in flight at a time, so a small pool suffices)
  const flyCount = 20

  const poolRefs = useRef<(SVGRectElement | null)[]>([])
  const flyRefs = useRef<(SVGRectElement | null)[]>([])
  const pileRefs = useRef<(SVGRectElement | null)[]>([])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `na-grad-${uid}`
  const blurId = `na-blur-${uid}`

  useEffect(() => {
    const pool = poolHome.map((p) => ({ size: p.baseSize, alpha: 0.7 }))
    const pileItems = pileSlots.map(() => ({
      active: false,
      x: 0,
      y: 0,
      opacity: 0,
    }))

    type Outcome = 'merge' | 'bounce' | 'fall'
    type Fly = {
      active: boolean
      state: 'flying' | 'redirect' | 'done'
      outcome: Outcome
      x: number
      y: number
      opacity: number
      targetX: number
      targetY: number
      poolIdx: number
      pileIdx: number
      vx: number
    }
    const flies: Fly[] = Array.from({ length: flyCount }, () => ({
      active: false,
      state: 'flying',
      outcome: 'fall',
      x: 0,
      y: 0,
      opacity: 0,
      targetX: 0,
      targetY: 0,
      poolIdx: -1,
      pileIdx: -1,
      vx: 0,
    }))

    let phase: 'running' | 'hold' | 'fade' | 'pause' = 'running'
    let phaseStart = performance.now()
    let runningStart = performance.now()
    let lastSpawn = -9999
    let nextPileIdx = 0
    const spawnInterval = 280
    const introDuration = 500
    const holdDuration = 400
    const fadeDuration = 350
    const pauseDuration = 200

    const reset = () => {
      phase = 'running'
      phaseStart = performance.now()
      runningStart = performance.now()
      lastSpawn = -9999
      nextPileIdx = 0
      for (let i = 0; i < pool.length; i++) {
        pool[i].size = poolHome[i].baseSize
        pool[i].alpha = 0.7
      }
      for (const it of pileItems) {
        it.active = false
        it.opacity = 0
      }
      for (const f of flies) {
        f.active = false
        f.opacity = 0
        f.state = 'flying'
      }
    }

    const spawnFly = () => {
      const f = flies.find((x) => !x.active)
      if (!f) return
      f.active = true
      f.state = 'flying'
      f.x = -20
      f.opacity = 0
      f.vx = 2.4 + Math.random() * 1.0

      // decide outcome; bias to 'fall' near the end so pile completes
      const remaining = totalPile - nextPileIdx
      let r = Math.random()
      // if pile nearly full, force fall
      let outcome: Outcome
      if (remaining <= 2) outcome = 'fall'
      else if (r < 0.34) outcome = 'merge'
      else if (r < 0.6) outcome = 'bounce'
      else outcome = 'fall'

      f.outcome = outcome
      if (outcome === 'merge') {
        f.poolIdx = Math.floor(Math.random() * poolCount)
        f.targetX = poolHome[f.poolIdx].x
        f.targetY = poolHome[f.poolIdx].y
        // entry y close to pool height so it visibly curves into the lump
        f.y = 60 + Math.random() * 60
      } else if (outcome === 'bounce') {
        f.pileIdx = nextPileIdx++
        f.targetX = pileSlots[f.pileIdx].x
        f.targetY = pileSlots[f.pileIdx].y
        // entry y aimed at the lump
        f.y = 70 + Math.random() * 50
      } else {
        f.pileIdx = nextPileIdx++
        f.targetX = pileSlots[f.pileIdx].x
        f.targetY = pileSlots[f.pileIdx].y
        // entry y below the lump so it just streams to the pile
        f.y = 150 + Math.random() * 40
      }
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      if (
        phase === 'running' &&
        nextPileIdx < totalPile &&
        now - lastSpawn >= spawnInterval
      ) {
        spawnFly()
        lastSpawn = now
      }

      let anyFly = false
      for (let i = 0; i < flies.length; i++) {
        const f = flies[i]
        const r = flyRefs.current[i]
        if (!f.active) {
          if (r) r.setAttribute('opacity', '0')
          continue
        }
        anyFly = true

        if (f.opacity < 0.75) {
          f.opacity = Math.min(0.75, f.opacity + 0.06 * step)
        }

        if (f.outcome === 'merge') {
          if (f.state === 'flying') {
            f.x += f.vx * step
            if (f.x > 260) f.state = 'redirect'
          }
          if (f.state === 'redirect') {
            const dx = f.targetX - f.x
            const dy = f.targetY - f.y
            const d = Math.hypot(dx, dy) || 0.0001
            if (d < 5) {
              f.active = false
              f.state = 'done'
              pool[f.poolIdx].size += 3.2
              if (r) r.setAttribute('opacity', '0')
              continue
            }
            const speed = 3.2
            f.x += (dx / d) * speed * step
            f.y += (dy / d) * speed * step
            // fade as it merges (last 50px)
            const fade = Math.min(1, d / 50)
            f.opacity = Math.min(f.opacity, 0.75 * fade)
          }
        } else if (f.outcome === 'bounce') {
          if (f.state === 'flying') {
            f.x += f.vx * step
            // graze the lump zone, then deflect down toward pile
            if (f.x > 360) f.state = 'redirect'
          }
          if (f.state === 'redirect') {
            const dx = f.targetX - f.x
            const dy = f.targetY - f.y
            const d = Math.hypot(dx, dy) || 0.0001
            if (d < 2) {
              f.x = f.targetX
              f.y = f.targetY
              f.active = false
              f.state = 'done'
              pileItems[f.pileIdx].active = true
              pileItems[f.pileIdx].x = f.x
              pileItems[f.pileIdx].y = f.y
              pileItems[f.pileIdx].opacity = 0.7
              if (r) r.setAttribute('opacity', '0')
              continue
            }
            const speed = 2.6
            f.x += (dx / d) * speed * step
            f.y += (dy / d) * speed * step
          }
        } else {
          // fall: stream rightward, then curve to pile slot
          if (f.state === 'flying') {
            f.x += f.vx * step
            if (f.x > f.targetX - 60) f.state = 'redirect'
          }
          if (f.state === 'redirect') {
            const dx = f.targetX - f.x
            const dy = f.targetY - f.y
            const d = Math.hypot(dx, dy) || 0.0001
            if (d < 2) {
              f.x = f.targetX
              f.y = f.targetY
              f.active = false
              f.state = 'done'
              pileItems[f.pileIdx].active = true
              pileItems[f.pileIdx].x = f.x
              pileItems[f.pileIdx].y = f.y
              pileItems[f.pileIdx].opacity = 0.7
              if (r) r.setAttribute('opacity', '0')
              continue
            }
            const speed = 2.6
            f.x += (dx / d) * speed * step
            f.y += (dy / d) * speed * step
          }
        }

        if (r) {
          const mod = qualityMod(f.x, f.y, now)
          r.setAttribute(
            'transform',
            `translate(${f.x} ${f.y}) scale(${mod.scaleMul})`,
          )
          r.setAttribute('opacity', String(f.opacity * mod.opacityMul))
        }
      }

      // pool render
      for (let i = 0; i < pool.length; i++) {
        const r = poolRefs.current[i]
        if (!r) continue
        const sz = pool[i].size
        r.setAttribute('x', String(poolHome[i].x - sz / 2))
        r.setAttribute('y', String(poolHome[i].y - sz / 2))
        r.setAttribute('width', String(sz))
        r.setAttribute('height', String(sz))
        let alpha = pool[i].alpha
        if (phase === 'fade') {
          const k = Math.min(1, (now - phaseStart) / fadeDuration)
          alpha *= 1 - k
        } else if (phase === 'running') {
          const k = Math.min(1, (now - runningStart) / introDuration)
          alpha *= k
        }
        r.setAttribute('opacity', String(alpha))
      }

      // pile render
      for (let i = 0; i < pileItems.length; i++) {
        const r = pileRefs.current[i]
        if (!r) continue
        const it = pileItems[i]
        if (!it.active) {
          r.setAttribute('opacity', '0')
          continue
        }
        r.setAttribute('transform', `translate(${it.x} ${it.y})`)
        let alpha = it.opacity
        if (phase === 'fade') {
          const k = Math.min(1, (now - phaseStart) / fadeDuration)
          alpha *= 1 - k
        }
        r.setAttribute('opacity', String(alpha))
      }

      // phase transitions
      if (phase === 'running' && nextPileIdx >= totalPile && !anyFly) {
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

      {/* lump: big particles in top-right */}
      <g>
        {poolHome.map((p, i) => (
          <rect
            key={`pool-${i}`}
            ref={(el) => {
              poolRefs.current[i] = el
            }}
            x={p.x - p.baseSize / 2}
            y={p.y - p.baseSize / 2}
            width={p.baseSize}
            height={p.baseSize}
            rx={6}
            ry={6}
            fill={`url(#${gradId})`}
            opacity={0.7}
          />
        ))}
      </g>

      {/* scattered pile slots in bottom-right */}
      <g filter={`url(#${blurId})`}>
        {pileSlots.map((_, i) => (
          <rect
            key={`pile-${i}`}
            ref={(el) => {
              pileRefs.current[i] = el
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

      {/* in-flight particles */}
      <g filter={`url(#${blurId})`}>
        {Array.from({ length: flyCount }).map((_, i) => (
          <rect
            key={`fly-${i}`}
            ref={(el) => {
              flyRefs.current[i] = el
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
