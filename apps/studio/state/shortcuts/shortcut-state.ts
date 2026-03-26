import { proxy, snapshot, subscribe, useSnapshot } from 'valtio'

import {
  SHORTCUT_DEFINITIONS,
  type ShortcutDefinition,
  type ShortcutId,
} from './registry'

const LOCAL_STORAGE_KEY = 'supabase-shortcut-overrides'

interface ShortcutOverride {
  hotkey?: string
  enabled?: boolean
}

interface ShortcutStateData {
  overrides: Record<string, ShortcutOverride>
}

function loadOverrides(): Record<string, ShortcutOverride> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistOverrides(overrides: Record<string, ShortcutOverride>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides))
}

function createShortcutState() {
  const state = proxy<ShortcutStateData>({
    overrides: loadOverrides(),
  })

  subscribe(state, () => {
    persistOverrides(state.overrides)
  })

  return state
}

export const shortcutState = createShortcutState()

export const useShortcutStateSnapshot = (options?: Parameters<typeof useSnapshot>[1]) =>
  useSnapshot(shortcutState, options)

export const getShortcutStateSnapshot = () => snapshot(shortcutState)

export function getEffectiveHotkey(id: ShortcutId): string {
  const override = shortcutState.overrides[id]
  return override?.hotkey ?? SHORTCUT_DEFINITIONS[id].defaultHotkey
}

export function isShortcutEnabled(id: ShortcutId): boolean {
  return shortcutState.overrides[id]?.enabled ?? true
}

export function setShortcutHotkey(id: ShortcutId, hotkey: string) {
  shortcutState.overrides[id] = {
    ...shortcutState.overrides[id],
    hotkey,
  }
}

export function setShortcutEnabled(id: ShortcutId, enabled: boolean) {
  shortcutState.overrides[id] = {
    ...shortcutState.overrides[id],
    enabled,
  }
}

export function resetShortcut(id: ShortcutId) {
  delete shortcutState.overrides[id]
}

export function resetAllShortcuts() {
  shortcutState.overrides = {}
}

/**
 * Returns other enabled shortcuts that use the same hotkey string.
 * Used to warn users about conflicts when rebinding.
 */
export function findConflicts(id: ShortcutId, hotkey: string): ShortcutDefinition[] {
  const normalizedHotkey = hotkey.toLowerCase()
  return Object.values(SHORTCUT_DEFINITIONS).filter((def) => {
    if (def.id === id) return false
    const effectiveHotkey =
      shortcutState.overrides[def.id]?.hotkey ?? def.defaultHotkey
    const isEnabled = shortcutState.overrides[def.id]?.enabled ?? true
    return isEnabled && effectiveHotkey.toLowerCase() === normalizedHotkey
  })
}
