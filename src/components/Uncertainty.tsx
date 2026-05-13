import { useEffect, useMemo, useRef } from 'react'
import { qualityMod } from './qualityField'

type Props = {
  className?: string
}

// Uncertainty: a calm left-to-right stream sets up an expectation. Once each
// particle crosses an invisible threshold it is hit by one random disturbance:
// violent vertical oscillation, sudden inflation, brief freeze, or vanishing.
// Forward velocity is preserved (the schedule moves on), but the path is not
// what we predicted.
export function Uncertainty({ className }: Props) {
  const w = 540
  const h = 240
  const cell = 16
  const cellR = 4.5
  const thresholdMin = 170
  const thresholdMax = 290

  const maxCount = 80

  const rectRefs = useRef<(SVGRectElement | null)[]>([])

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const gradId = `un-grad-${uid}`
  const blurId = `un-blur-${uid}`

  useEffect(() => {
    type Disturb = 'oscillate' | 'inflate' | 'vanish' | 'freeze' | 'normal'
    type P = {
      active: boolean
      kind: Disturb
      x: number
      y: number
      vx: number
      baseVx: number
      opacity: number
      scale: number
      triggered: boolean
      triggerAt: number
      // disturbance params
      oscPhase: number
      oscAmp: number
      oscFreq: number
      vanishX: number
      freezeUntil: number
      inflateTarget: number
      wobbleSeed: number
      triggerX: number
    }

    const ps: P[] = Array.from({ length: maxCount }, () => ({
      active: false,
      kind: 'normal',
      x: 0,
      y: 0,
      vx: 0,
      baseVx: 0,
      opacity: 0,
      scale: 1,
      triggered: false,
      triggerAt: 0,
      oscPhase: 0,
      oscAmp: 0,
      oscFreq: 0,
      vanishX: 0,
      freezeUntil: 0,
      inflateTarget: 1,
      wobbleSeed: 0,
      triggerX: 0,
    }))

    const spawnInterval = 110
    let lastSpawn = -9999

    const pickKind = (): Disturb => {
      const r = Math.random()
      if (r < 0.32) return 'oscillate'
      if (r < 0.52) return 'inflate'
      if (r < 0.72) return 'vanish'
      if (r < 0.86) return 'freeze'
      return 'normal'
    }

    const spawn = () => {
      const p = ps.find((x) => !x.active)
      if (!p) return
      p.active = true
      p.x = -12
      p.y = 28 + Math.random() * (h - 56)
      p.vx = 1.4 + Math.random() * 0.6
      p.baseVx = p.vx
      p.opacity = 0
      p.scale = 1
      p.triggered = false
      p.triggerAt = 0
      p.kind = pickKind()
      p.oscPhase = Math.random() * Math.PI * 2
      p.oscAmp = 36 + Math.random() * 30
      p.oscFreq = 0.015 + Math.random() * 0.012 // rad/ms
      p.triggerX =
        thresholdMin + Math.random() * (thresholdMax - thresholdMin)
      p.vanishX = p.triggerX + 30 + Math.random() * 160
      p.freezeUntil = 0
      p.inflateTarget = 2.4 + Math.random() * 1.4
      p.wobbleSeed = Math.random() * 10
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      const step = dt / 16

      if (now - lastSpawn >= spawnInterval) {
        spawn()
        lastSpawn = now
      }

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const r = rectRefs.current[i]
        if (!p.active) {
          if (r) r.setAttribute('opacity', '0')
          continue
        }

        // trigger disturbance once past threshold
        if (!p.triggered && p.x >= p.triggerX) {
          p.triggered = true
          p.triggerAt = now
          if (p.kind === 'freeze') {
            p.freezeUntil = now + 250 + Math.random() * 500
          }
        }

        // motion (vx preserved except during 'freeze' window)
        let moving = true
        if (p.triggered && p.kind === 'freeze' && now < p.freezeUntil) {
          moving = false
        }
        if (moving) {
          p.x += p.vx * step
        }

        let renderY = p.y
        let renderScale = 1

        // baseline opacity (fade in from left, fade out near right)
        let fadeIn = Math.min(1, (p.x + 12) / 40)
        fadeIn = fadeIn * fadeIn
        let edgeR = 1
        if (p.x > w - 70) edgeR = (w - p.x) / 70
        edgeR = Math.max(0, Math.min(1, edgeR))
        let baselineOp = 0.78 * fadeIn * edgeR * edgeR

        // gentle pre-threshold wobble (subtle)
        if (!p.triggered) {
          renderY = p.y + Math.sin(now * 0.001 + p.wobbleSeed) * 1.4
        }

        if (p.triggered) {
          if (p.kind === 'oscillate') {
            renderY =
              p.y + Math.sin(now * p.oscFreq + p.oscPhase) * p.oscAmp
            renderY = Math.max(8, Math.min(h - 8, renderY))
          } else if (p.kind === 'inflate') {
            const k = Math.min(1, (now - p.triggerAt) / 220)
            const eased = 1 - Math.pow(1 - k, 2)
            renderScale = 1 + (p.inflateTarget - 1) * eased
          } else if (p.kind === 'vanish') {
            if (p.x >= p.vanishX) {
              const k = Math.min(1, (p.x - p.vanishX) / 28)
              baselineOp *= 1 - k
              if (k >= 1) {
                p.active = false
                if (r) r.setAttribute('opacity', '0')
                continue
              }
            }
          } else if (p.kind === 'freeze') {
            // small jittery quiver while frozen
            if (now < p.freezeUntil) {
              renderY =
                p.y + Math.sin(now * 0.06 + p.wobbleSeed) * 1.6
            }
          }
        }

        if (p.x > w + 30) {
          p.active = false
          if (r) r.setAttribute('opacity', '0')
          continue
        }

        const mod = qualityMod(p.x, renderY, now)
        const finalScale = renderScale * mod.scaleMul

        if (r) {
          r.setAttribute(
            'transform',
            `translate(${p.x} ${renderY}) scale(${finalScale})`,
          )
          r.setAttribute('opacity', String(baselineOp * mod.opacityMul))
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
        {Array.from({ length: maxCount }).map((_, i) => (
          <rect
            key={i}
            ref={(el) => {
              rectRefs.current[i] = el
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
