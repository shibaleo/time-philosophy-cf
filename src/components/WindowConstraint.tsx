import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Window Constraint: a continuous left-to-right stream flows past a long thin
// frame that appears in the canvas. Particles passing through the frame's
// region get trapped into a fixed grid of slots inside it. Once every slot is
// filled, the frame fades away and the cycle restarts. The trapped particles
// represent value that only existed within that specific window.
export function WindowConstraint({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const cellR = 4.5

  // frame layout — tall thin window in the middle
  const frameW = 60
  const frameH = 200
  const frameX = (540 - frameW) / 2
  const frameY = (240 - frameH) / 2

  // capture target — cycle ends once this many particles have locked in
  const totalSlots = 18
  // minimum spacing so locked particles don't overlap badly
  const minSep = 17

  const maxFlow = 90

  const flowRefs = useRef<(SVGRectElement | null)[]>([])
  const trapRefs = useRef<(SVGRectElement | null)[]>([])
  const frameRef = useRef<SVGRectElement | null>(null)

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `wn-grad-${uid}`
  const blurId = `wn-blur-${uid}`

  useEffect(() => {
    type Flow = {
      active: boolean
      x: number
      y: number
      vx: number
      wobbleSeed: number
      wobbleAmp: number
      wobbleSpeed: number
      opacity: number
      decided: boolean
    }
    const flows: Flow[] = Array.from({ length: maxFlow }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      wobbleSeed: 0,
      wobbleAmp: 0,
      wobbleSpeed: 0,
      opacity: 0,
      decided: false,
    }))

    type Trap = { active: boolean; x: number; y: number; opacity: number }
    const traps: Trap[] = Array.from({ length: totalSlots }, () => ({
      active: false,
      x: 0,
      y: 0,
      opacity: 0,
    }))

    let phase: 'open' | 'hold' | 'fade' | 'pause' = 'open'
    let phaseStart = performance.now()
    let frameAppearAt = performance.now()
    let nextSlot = 0
    let lastSpawn = -9999
    const spawnInterval = 110
    const frameFadeInDur = 500
    const holdDur = 600
    const fadeDur = 450
    const pauseDur = 600
    const captureProb = 0.75

    const resetCycle = (now: number) => {
      phase = 'open'
      phaseStart = now
      frameAppearAt = now
      nextSlot = 0
      for (const t of traps) {
        t.active = false
        t.opacity = 0
      }
      // flowing particles keep streaming through cycles
    }

    const spawnFlow = () => {
      const f = flows.find((x) => !x.active)
      if (!f) return
      f.active = true
      f.x = -12
      f.y = 22 + Math.random() * (h - 44)
      f.vx = 1.4 + Math.random() * 0.7
      f.wobbleSeed = Math.random() * 10
      f.wobbleAmp = 1.0 + Math.random() * 2.0
      f.wobbleSpeed = 0.0007 + Math.random() * 0.0012
      f.opacity = 0
      f.decided = false
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

      // frame alpha
      let frameAlpha = 0
      if (phase === 'open') {
        const k = Math.min(1, (now - frameAppearAt) / frameFadeInDur)
        frameAlpha = 0.6 * k
      } else if (phase === 'hold') {
        frameAlpha = 0.6
      } else if (phase === 'fade') {
        const k = Math.min(1, (now - phaseStart) / fadeDur)
        frameAlpha = 0.6 * (1 - k)
      }
      if (frameRef.current) {
        frameRef.current.setAttribute('opacity', String(frameAlpha))
      }

      // update flowing particles
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

        // capture: while passing through the window, lock at the current
        // position. No vertical adjustment — only flow particles whose y is
        // already inside the frame qualify, and their position is preserved.
        if (
          !f.decided &&
          phase === 'open' &&
          nextSlot < totalSlots &&
          f.x >= frameX + 4 &&
          f.x <= frameX + frameW - 4 &&
          renderY >= frameY + 8 &&
          renderY <= frameY + frameH - 8 &&
          Math.random() < captureProb
        ) {
          // reject if too close to an existing locked particle
          let blocked = false
          for (const t of traps) {
            if (!t.active) continue
            if (Math.hypot(t.x - f.x, t.y - renderY) < minSep) {
              blocked = true
              break
            }
          }
          if (!blocked) {
            f.decided = true
            const slot = traps[nextSlot]
            slot.active = true
            slot.x = f.x
            slot.y = renderY
            slot.opacity = 0.78
            nextSlot++
            f.active = false
            if (r) r.setAttribute('opacity', '0')
            continue
          }
        }

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

      // update trapped particles
      for (let i = 0; i < traps.length; i++) {
        const t = traps[i]
        const r = trapRefs.current[i]
        if (!r) continue
        if (!t.active) {
          r.setAttribute('opacity', '0')
          continue
        }
        r.setAttribute('transform', `translate(${t.x} ${t.y})`)
        let alpha = t.opacity
        if (phase === 'fade') {
          const k = Math.min(1, (now - phaseStart) / fadeDur)
          alpha *= 1 - k
        } else if (phase === 'pause') {
          alpha = 0
        }
        r.setAttribute('opacity', String(alpha))
      }

      // phase transitions
      if (phase === 'open' && nextSlot >= totalSlots) {
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
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a8e0d8" stopOpacity="0.45" />
        </linearGradient>
        <filter id={blurId} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>

      <rect
        ref={frameRef}
        x={frameX - 6}
        y={frameY - 6}
        width={frameW + 12}
        height={frameH + 12}
        rx={14}
        ry={14}
        fill="none"
        stroke="#9ec5ff"
        strokeWidth={1}
        opacity={0}
      />

      <g filter={`url(#${blurId})`}>
        {Array.from({ length: totalSlots }).map((_, i) => (
          <rect
            key={`trap-${i}`}
            ref={(el) => {
              trapRefs.current[i] = el
            }}
            x={-cell / 2}
            y={-cell / 2}
            width={cell}
            height={cell}
            rx={cellR}
            ry={cellR}
            fill={`url(#${gradId})`}
            opacity={0}
          />
        ))}
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
            fill={`url(#${gradId})`}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  )
}
