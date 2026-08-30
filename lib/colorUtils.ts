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

import type { ThemeId } from './themes'

const THEME_TARGETS: Record<ThemeId, { bg: string; neutral: string }> = {
  midnight:  { bg: '#0a0c14', neutral: '#cbd5e1' },
  tokyo:     { bg: '#0c0d14', neutral: '#dcd6f7' },
  cyberpunk: { bg: '#06070a', neutral: '#cce3f0' },
  aurora:    { bg: '#081111', neutral: '#c4dede' },
  amber:     { bg: '#0d0b09', neutral: '#dfd5cb' },
}

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

export function getThemeTargets(themeId?: ThemeId) {
  return THEME_TARGETS[themeId || 'midnight'] || THEME_TARGETS.midnight
}

/** Dulled solid for the day-cell hour bars, borders, and legend indicators. */
export function mutedBar(jobColor: string, themeId?: ThemeId): string {
  const { bg } = getThemeTargets(themeId)
  return mixHex(jobColor, bg, 0.48)
}

/** Pastel text that keeps the job's hue in a gentle, theme-harmonized tone. */
export function mutedText(jobColor: string, themeId?: ThemeId): string {
  const { neutral } = getThemeTargets(themeId)
  return mixHex(jobColor, neutral, 0.46)
}

/** Dark chip background subtly tinted with the job's hue, matched to the theme's background. */
export function mutedChipBg(jobColor: string, themeId?: ThemeId): string {
  const { bg } = getThemeTargets(themeId)
  return mixHex(bg, jobColor, 0.18)
}
