/**
 * Contour texture for the ripple shader.
 *
 * The site no longer paints the static blue hairlines in AtmosphereLayer.
 * This still returns a sized transparent canvas so `uContours` sampling in
 * HeroRippleBackground stays valid without a shader/uniform teardown.
 */
export function drawContourField(width: number, height: number): HTMLCanvasElement | null {
  if (width < 1 || height < 1) return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.clearRect(0, 0, width, height)
  return canvas
}
