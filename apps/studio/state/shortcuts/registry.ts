import { ShortcutDefinition, ShortcutId } from './types'

export const SHORTCUT_IDS = {
  RESULTS_COPY_MARKDOWN: 'results.copy-markdown',
} as const

export const SHORTCUT_DEFINITIONS: Record<ShortcutId, ShortcutDefinition> = {
  [SHORTCUT_IDS.RESULTS_COPY_MARKDOWN]: {
    id: SHORTCUT_IDS.RESULTS_COPY_MARKDOWN,
    label: 'Copy results as Markdown',
    category: 'results',
    defaultHotkey: 'Mod+Shift+m',
  },
}
