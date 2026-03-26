export type ShortcutCategory = 'general' | 'navigation' | 'editing' | 'panels' | 'results'

export interface ShortcutDefinition {
  id: string
  label: string
  description?: string
  category: ShortcutCategory
  defaultHotkey: string
}

export const SHORTCUT_IDS = {
  RESULTS_COPY_MARKDOWN: 'results.copy-markdown',
} as const

export type ShortcutId = (typeof SHORTCUT_IDS)[keyof typeof SHORTCUT_IDS]

export const SHORTCUT_DEFINITIONS: Record<ShortcutId, ShortcutDefinition> = {
  [SHORTCUT_IDS.RESULTS_COPY_MARKDOWN]: {
    id: SHORTCUT_IDS.RESULTS_COPY_MARKDOWN,
    label: 'Copy results as Markdown',
    category: 'results',
    defaultHotkey: 'Mod+Shift+m',
  },
}

/** All categories in display order */
export const SHORTCUT_CATEGORIES: { key: ShortcutCategory; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'panels', label: 'Panels' },
  { key: 'editing', label: 'Editing' },
  { key: 'results', label: 'Results' },
  { key: 'navigation', label: 'Navigation' },
]
