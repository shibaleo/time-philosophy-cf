import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// A finite reservoir on the left empties to the right.
// Total volume is fixed; exits start steady and trail off so the very end is
// stochastic. After the last particle leaves, the reservoir's outer frame
// fades out a beat later — finiteness without a hard wall.
export function Finite({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const radius = 4.5

  // reservoir bounding box (left side)
  const resPadX = 24
  const resW = 180
  const resH = 168
  const resX = resPadX
  const resY = (h - resH) / 2

  // sparse scatter inside the reservoir
  const count = 12
  const innerPad = 12
  const minSep = 22

  const svgRef = useRef<SVGSVGElement>(null)
  const rectRefs = useRef<(SVGRectElement | null)[]>([])
  const frameRef = useRef<SVGRectElement | null>(null)

  useEffect(() => {
    const maxOpacity = 0.75
    const fadeInLen = 80 // distance from right edge over which exiting particles fade out

    type P = {
      homeX: number
      homeY: number
      x: number
      y: number
      vx: number
      opacity: number
      state: 'rest' | 'exit'
      jitterSeed: number
      exitDelay: number // ms from cycle start
    }

    // distribute exit times: cluster early, trail off late (尻すぼみ)
    // exitDelay = totalDuration * (i/N)^1.7 + jitter, after a shuffle so it's not left-to-right
    const totalDuration = 2400 // ms over which the reservoir empties
    const tailJitter = 600
    const indices = Array.from({ length: count }, (_, i) => i)
    // shuffle so departure order doesn't correlate with grid position
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    const exitTimes: number[] = new Array(count)
    for (let k = 0; k < count; k++) {
      const t = totalDuration * Math.pow(k / (count - 1), 1.25)
      exitTimes[indices[k]] = t + (Math.random() - 0.5) * tailJitter
    }

    const minX = resX + innerPad
    const maxX = resX + resW - innerPad
    const minY = resY + innerPad
    const maxY = resY + resH - innerPad
    const placed: { x: number; y: number }[] = []
    const pickHome = () => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const x = minX + Math.random() * (maxX - minX)
        const y = minY + Math.random() * (maxY - minY)
        let ok = true
        for (const q of placed) {
          if (Math.hypot(q.x - x, q.y - y) < minSep) {
            ok = false
            break
          }
        }
        if (ok) {
          placed.push({ x, y })
          return { x, y }
        }
      }
      const x = minX + Math.random() * (maxX - minX)
      const y = minY + Math.random() * (maxY - minY)
      placed.push({ x, y })
      return { x, y }
    }

    const ps: P[] = []
    for (let i = 0; i < count; i++) {
      const home = pickHome()
      const p: P = {
        homeX: home.x,
        homeY: home.y,
        x: 0,
        y: 0,
        vx: 0,
        opacity: maxOpacity,
        state: 'rest',
        jitterSeed: Math.random() * 10,
        exitDelay: exitTimes[i],
      }
      p.x = p.homeX
      p.y = p.homeY
      ps.push(p)
    }

    const framePauseAfter = 0
    const restartPause = 900

    let cycleStart = performance.now()
    let frameFadeStarted = false
    let frameOpacity = 0.6
    let frameOffsetY = 0
    let raf = 0
    let last = performance.now()

    const resetCycle = (now: number) => {
      cycleStart = now
      frameFadeStarted = false
      frameOpacity = 0.6
      frameOffsetY = 0
      // re-shuffle exit times for variety
      const idx = Array.from({ length: count }, (_, i) => i)
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[idx[i], idx[j]] = [idx[j], idx[i]]
      }
      for (let k = 0; k < count; k++) {
        const t =
          totalDuration * Math.pow(k / (count - 1), 1.25) +
          (Math.random() - 0.5) * tailJitter
        const p = ps[idx[k]]
        p.exitDelay = t
        p.state = 'rest'
        p.x = p.homeX
        p.y = p.homeY
        p.vx = 0
        p.opacity = maxOpacity
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16
      const elapsed = now - cycleStart

      let allGone = true
      let allPastFrame = true
      const frameRightEdge = resX + resW
      for (let i = 0; i < count; i++) {
        const p = ps[i]
        if (p.state === 'rest') {
          if (elapsed >= p.exitDelay) {
            p.state = 'exit'
            p.vx = 2.6 + Math.random() * 1.8
          } else {
            // gentle in-place breathing
            const wob =
              Math.sin(now * 0.0015 + p.jitterSeed) * 0.6 +
              Math.cos(now * 0.0011 + p.jitterSeed * 1.3) * 0.5
            const r = rectRefs.current[i]
            if (r) {
              const mod = qualityMod(p.homeX, p.homeY, now)
              r.setAttribute(
                'transform',
                `translate(${p.homeX} ${p.homeY + wob}) scale(${mod.scaleMul})`,
              )
              r.setAttribute('opacity', String(p.opacity * mod.opacityMul))
            }
            allGone = false
            allPastFrame = false
            continue
          }
        }

        // state === 'exit'
        p.x += p.vx * step
        // tiny vertical wobble during exit
        const yWob = Math.sin(now * 0.002 + p.jitterSeed) * 1.2
        // fade out as it approaches and crosses the right edge
        let fadeRatio = 1
        if (p.x > w - fadeInLen) fadeRatio = (w + 10 - p.x) / fadeInLen
        fadeRatio = Math.max(0, Math.min(1, fadeRatio))
        p.opacity = maxOpacity * fadeRatio * fadeRatio

        if (p.opacity > 0.001) allGone = false
        if (p.x <= frameRightEdge) allPastFrame = false

        const r = rectRefs.current[i]
        if (r) {
          const mod = qualityMod(p.x, p.y, now)
          r.setAttribute(
            'transform',
            `translate(${p.x} ${p.y + yWob}) scale(${mod.scaleMul})`,
          )
          r.setAttribute('opacity', String(p.opacity * mod.opacityMul))
        }
      }

      // frame fade once the last particle has crossed the reservoir's right edge
      if (allPastFrame && !frameFadeStarted) {
        frameFadeStarted = true
        // schedule the frame fade
        const fadeStart = now + framePauseAfter
        const fadeDuration = 500
        const dropDistance = 28
        const animateFrame = (t2: number) => {
          if (t2 < fadeStart) {
            return
          }
          const k = Math.min(1, (t2 - fadeStart) / fadeDuration)
          frameOpacity = 0.6 * (1 - k)
          // ease-in for the drop so it accelerates as it disappears
          frameOffsetY = dropDistance * k * k
        }
        // store the closure on the cycle — handled in main loop via timestamp
        ;(tick as unknown as { _fade: typeof animateFrame })._fade = animateFrame
      }

      const fadeFn = (tick as unknown as { _fade?: (t: number) => void })._fade
      if (fadeFn) fadeFn(now)

      if (frameRef.current) {
        frameRef.current.setAttribute('opacity', String(frameOpacity))
        frameRef.current.setAttribute('transform', `translate(0 ${frameOffsetY})`)
      }

      // restart cycle after frame has fully faded + pause
      if (allGone && frameOpacity <= 0.001) {
        // small delay before restart — handled by tracking time
        if (!(tick as unknown as { _restartAt?: number })._restartAt) {
          ;(tick as unknown as { _restartAt: number })._restartAt =
            now + restartPause
        }
        const ra = (tick as unknown as { _restartAt: number })._restartAt
        if (now >= ra) {
          resetCycle(now)
          delete (tick as unknown as { _fade?: unknown })._fade
          delete (tick as unknown as { _restartAt?: number })._restartAt
          // fade frame back in over the first second
          const reFadeStart = now
          const reFadeDur = 900
          const reFade = (t2: number) => {
            const k = Math.min(1, (t2 - reFadeStart) / reFadeDur)
            frameOpacity = 0.6 * k
            frameOffsetY = 0
          }
          ;(tick as unknown as { _fade: typeof reFade })._fade = reFade
          // clear the re-fade once full
          setTimeout(() => {
            const cur = (tick as unknown as { _fade?: (t: number) => void })._fade
            if (cur === reFade) {
              delete (tick as unknown as { _fade?: unknown })._fade
              frameOpacity = 0.6
            }
          }, reFadeDur + 50)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `fn-grad-${uid}`
  const blurId = `fn-blur-${uid}`

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

      <rect
        ref={frameRef}
        x={resX - 6}
        y={resY - 6}
        width={resW + 12}
        height={resH + 12}
        rx={14}
        ry={14}
        fill="none"
        stroke="#9ec5ff"
        strokeWidth={1}
        opacity={0.6}
      />

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
