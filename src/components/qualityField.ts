// Two-wave 2D field returning a value in [0, 1]. Used to modulate particle
// brightness and (subtly) size so the medium looks heterogeneous — bands of
// "rich" and "thin" texture slowly drift across the canvas.
export function qualityField(x: number, y: number, t: number): number {
  const a = Math.sin(x * 0.013 + t * 0.00045)
  const b = Math.sin(x * 0.0065 - t * 0.00032 + y * 0.011)
  return Math.max(0, Math.min(1, (a + b + 2) / 4))
}

type Opts = {
  /** opacity multiplier range — [low, high] applied as field maps 0→low, 1→high */
  opacityRange?: [number, number]
  /** scale multiplier range */
  scaleRange?: [number, number]
  /** contrast curve exponent on the field value before mapping */
  curve?: number
}

export function qualityMod(
  x: number,
  y: number,
  t: number,
  opts: Opts = {},
): { opacityMul: number; scaleMul: number } {
  const { opacityRange = [0.5, 1.0], scaleRange = [0.78, 1.18], curve = 1.6 } =
    opts
  const q = Math.pow(qualityField(x, y, t), curve)
  return {
    opacityMul: opacityRange[0] + (opacityRange[1] - opacityRange[0]) * q,
    scaleMul: scaleRange[0] + (scaleRange[1] - scaleRange[0]) * q,
  }
}
