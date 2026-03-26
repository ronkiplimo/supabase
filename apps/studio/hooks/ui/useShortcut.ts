import useLatest from 'hooks/misc/useLatest'
import { useEffect } from 'react'
import { eventMatchesHotkey, parseHotkey } from 'state/shortcuts/hotkey-utils'
import { SHORTCUT_DEFINITIONS } from 'state/shortcuts/registry'
import { useShortcutStateSnapshot } from 'state/shortcuts/shortcut-state'
import { ShortcutId } from 'state/shortcuts/types'

/**
 * Subscribe to a registered shortcut by ID.
 *
 * Resolves the effective hotkey (user override or default) and enabled state,
 * then registers a global keydown listener.
 *
 * @example
 * useShortcut(SHORTCUT_IDS.TABLE_EDITOR_SAVE, (e) => {
 *   e.preventDefault()
 *   handleSave()
 * }, { enabled: hasChanges })
 */
export function useShortcut(
  id: ShortcutId,
  callback: (e: KeyboardEvent) => void,
  options?: { enabled?: boolean }
) {
  const snap = useShortcutStateSnapshot()
  const def = SHORTCUT_DEFINITIONS[id]

  const effectiveHotkey = (snap.overrides[id]?.hotkey as string) ?? def.defaultHotkey
  const isEnabled = ((snap.overrides[id]?.enabled as boolean) ?? true) && (options?.enabled ?? true)

  const callbackRef = useLatest(callback)
  const enabledRef = useLatest(isEnabled)
  const hotkeyRef = useLatest(effectiveHotkey)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!enabledRef.current) return

      const parsed = parseHotkey(hotkeyRef.current)
      if (eventMatchesHotkey(e, parsed)) {
        callbackRef.current(e)
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [callbackRef, enabledRef, hotkeyRef])
}
