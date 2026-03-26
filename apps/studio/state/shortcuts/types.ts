import { SHORTCUT_IDS } from './registry'

export type ShortcutCategory = 'general' | 'navigation' | 'editing' | 'panels' | 'results'

/** All categories in display order */
export const SHORTCUT_CATEGORIES: { key: ShortcutCategory; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'panels', label: 'Panels' },
  { key: 'editing', label: 'Editing' },
  { key: 'results', label: 'Results' },
  { key: 'navigation', label: 'Navigation' },
]

export interface ShortcutDefinition {
  id: string
  label: string
  description?: string
  category: ShortcutCategory
  defaultHotkey: string
}

export type ShortcutId = (typeof SHORTCUT_IDS)[keyof typeof SHORTCUT_IDS]
