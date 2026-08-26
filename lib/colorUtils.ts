/**
 * Job-color softening for the dark UI.
 *
 * Job colors are stored full-saturation (user-picked or defaults like
 * #f59e0b). Rendered raw they glare against the dark background, so
 * every calendar surface derives calmer variants:
 *
 *   bar   — solid but dulled (mixed toward the app background)
 *   text  — pastel (mixed toward a soft neutral)
 *   chip  — dark tinted chip background
 *
 * Pure functions, no deps — deterministic and SSR-safe.
 */

const BG = '#0f121c'        // ≈ var(--card) family, mix target for surfaces
const NEUTRAL = '#cbd5e1'   // soft slate neutral, mix target for text

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Linear mix of two hex colors. `t` is the weight of `b` (0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

/** Dulled solid for the day-cell hour bars, borders, and legend indicators. */
export function mutedBar(jobColor: string): string {
  return mixHex(jobColor, BG, 0.50)
}

/** Pastel text that keeps the job's hue in a gentle, non-glaring tone. */
export function mutedText(jobColor: string): string {
  return mixHex(jobColor, NEUTRAL, 0.48)
}

/** Dark chip background subtly tinted with the job's hue. */
export function mutedChipBg(jobColor: string): string {
  return mixHex(BG, jobColor, 0.16)
}
