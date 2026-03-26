import { useCallback, useEffect, useState } from 'react'
import { Button, KeyboardShortcut } from 'ui'

import { findConflicts, setShortcutHotkey } from 'state/shortcuts/shortcut-state'
import { eventToHotkeyString, hotkeyToDisplayKeys } from 'state/shortcuts/hotkey-utils'
import type { ShortcutId } from 'state/shortcuts/registry'

interface ShortcutRecorderProps {
  shortcutId: ShortcutId
  currentHotkey: string
}

export function ShortcutRecorder({ shortcutId, currentHotkey }: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedHotkey, setRecordedHotkey] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    setRecordedHotkey(null)
    setConflicts([])
  }, [])

  useEffect(() => {
    if (!isRecording) return

    function handler(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        stopRecording()
        return
      }

      const hotkey = eventToHotkeyString(e)
      if (!hotkey) return // only modifiers pressed so far

      setRecordedHotkey(hotkey)

      const conflicting = findConflicts(shortcutId, hotkey)
      if (conflicting.length > 0) {
        setConflicts(conflicting.map((c) => c.label))
        return
      }

      setConflicts([])
      setShortcutHotkey(shortcutId, hotkey)
      setIsRecording(false)
      setRecordedHotkey(null)
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isRecording, shortcutId, stopRecording])

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        {recordedHotkey ? (
          <KeyboardShortcut keys={hotkeyToDisplayKeys(recordedHotkey)} />
        ) : (
          <span className="text-xs text-foreground-lighter">Press a key combo...</span>
        )}
        {conflicts.length > 0 && (
          <span className="text-xs text-warning">
            Conflicts with: {conflicts.join(', ')}
          </span>
        )}
        <Button type="default" size="tiny" onClick={stopRecording}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="group flex items-center gap-2 cursor-pointer"
      onClick={() => {
        setConflicts([])
        setIsRecording(true)
      }}
    >
      <KeyboardShortcut keys={hotkeyToDisplayKeys(currentHotkey)} />
      <span className="text-xs text-foreground-lighter opacity-0 group-hover:opacity-100 transition-opacity">
        Click to rebind
      </span>
    </button>
  )
}
