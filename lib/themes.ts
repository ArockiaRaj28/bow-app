export type ThemeId = 'midnight' | 'tokyo' | 'cyberpunk' | 'aurora' | 'amber'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  subtitle: string
  icon: string
  preview: {
    bg: string
    card: string
    accent: string
    accent2: string
    border: string
  }
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight Slate',
    subtitle: 'Classic deep navy with indigo accents',
    icon: '🌌',
    preview: {
      bg: '#0a0c14',
      card: '#1a1d2e',
      accent: '#6366f1',
      accent2: '#3b82f6',
      border: '#2a2d3a',
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    subtitle: 'Mystic night plum with soft violet accents',
    icon: '🌸',
    preview: {
      bg: '#0c0d14',
      card: '#1a1b2e',
      accent: '#c084fc',
      accent2: '#f43f5e',
      border: '#282a44',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Dusk',
    subtitle: 'OLED pitch dark with neon cyan & pink',
    icon: '⚡',
    preview: {
      bg: '#06070a',
      card: '#151824',
      accent: '#06b6d4',
      accent2: '#ec4899',
      border: '#22273a',
    },
  },
  {
    id: 'aurora',
    name: 'Nordic Aurora',
    subtitle: 'Deep boreal forest with emerald & teal',
    icon: '🌲',
    preview: {
      bg: '#081111',
      card: '#142626',
      accent: '#14b8a6',
      accent2: '#10b981',
      border: '#203c3c',
    },
  },
  {
    id: 'amber',
    name: 'Warm Obsidian',
    subtitle: 'Dark charcoal with honey amber & bronze',
    icon: '🔥',
    preview: {
      bg: '#0d0b09',
      card: '#221c17',
      accent: '#f59e0b',
      accent2: '#fb923c',
      border: '#352d24',
    },
  },
]
