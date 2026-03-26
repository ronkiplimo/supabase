/**
 * Parsed representation of a hotkey string like 'Mod+Shift+m'.
 */
export interface ParsedHotkey {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

/**
 * Parse a hotkey string into its components.
 *
 * Format: modifier parts joined by '+', e.g. 'Mod+k', 'Mod+Shift+m', 'Escape'
 * 'Mod' maps to Cmd on Mac, Ctrl elsewhere.
 */
export function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey.split('+').map((p) => p.trim())
  const result: ParsedHotkey = { mod: false, shift: false, alt: false, key: '' }

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'mod') {
      result.mod = true
    } else if (lower === 'shift') {
      result.shift = true
    } else if (lower === 'alt') {
      result.alt = true
    } else {
      result.key = lower
    }
  }

  return result
}

/**
 * Check whether a KeyboardEvent matches a parsed hotkey.
 * 'Mod' matches metaKey on Mac, ctrlKey elsewhere.
 */
export function eventMatchesHotkey(e: KeyboardEvent, hotkey: ParsedHotkey): boolean {
  const hasMod = e.metaKey || e.ctrlKey

  if (hotkey.mod !== hasMod) return false
  if (hotkey.shift !== e.shiftKey) return false
  if (hotkey.alt !== e.altKey) return false

  return e.key.toLowerCase() === hotkey.key
}

/**
 * Convert a hotkey string ('Mod+Shift+m') to the keys array format
 * expected by the KeyboardShortcut UI component (['Meta', 'Shift', 'm']).
 *
 * 'Mod' is mapped to 'Meta', which the KeyboardShortcut component
 * renders as ⌘ on Mac or Ctrl elsewhere.
 */
export function hotkeyToDisplayKeys(hotkey: string): string[] {
  return hotkey.split('+').map((part) => {
    const trimmed = part.trim()
    if (trimmed.toLowerCase() === 'mod') return 'Meta'
    return trimmed
  })
}

/**
 * Build a hotkey string from a KeyboardEvent, for use in the shortcut recorder.
 * Returns null if only modifier keys are pressed (no "real" key yet).
 */
export function eventToHotkeyString(e: KeyboardEvent): string | null {
  const modifierKeys = new Set(['Control', 'Meta', 'Shift', 'Alt'])
  if (modifierKeys.has(e.key)) return null

  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('Mod')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  parts.push(e.key.length === 1 ? e.key.toLowerCase() : e.key)

  return parts.join('+')
}
