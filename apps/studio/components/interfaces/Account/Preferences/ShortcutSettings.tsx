import { RotateCcw } from 'lucide-react'
import { hotkeyToDisplayKeys } from 'state/shortcuts/hotkey-utils'
import { SHORTCUT_DEFINITIONS } from 'state/shortcuts/registry'
import {
  resetAllShortcuts,
  resetShortcut,
  setShortcutEnabled,
  useShortcutStateSnapshot,
} from 'state/shortcuts/shortcut-state'
import { SHORTCUT_CATEGORIES, ShortcutDefinition, ShortcutId } from 'state/shortcuts/types'
import { Button, Card, CardContent, KeyboardShortcut, Switch } from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { ShortcutRecorder } from './ShortcutRecorder'

function ShortcutRow({ definition, isLast }: { definition: ShortcutDefinition; isLast: boolean }) {
  const snap = useShortcutStateSnapshot()
  const override = snap.overrides[definition.id]
  const effectiveHotkey = (override?.hotkey as string) ?? definition.defaultHotkey
  const isEnabled = (override?.enabled as boolean) ?? true
  const isCustomized = !!override?.hotkey

  return (
    <CardContent className={isLast ? undefined : 'border-b'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <ShortcutRecorder
            shortcutId={definition.id as ShortcutId}
            currentHotkey={effectiveHotkey}
          />
          <span className="text-sm">{definition.label}</span>
          {isCustomized && (
            <button
              type="button"
              className="text-xs text-foreground-lighter hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => resetShortcut(definition.id as ShortcutId)}
              title={`Reset to default (${hotkeyToDisplayKeys(definition.defaultHotkey).join('+')})`}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(value) => setShortcutEnabled(definition.id as ShortcutId, value)}
        />
      </div>
    </CardContent>
  )
}

export function ShortcutSettings() {
  const snap = useShortcutStateSnapshot()
  const hasOverrides = Object.keys(snap.overrides).length > 0

  const definitionsByCategory = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: Object.values(SHORTCUT_DEFINITIONS).filter((d) => d.category === cat.key),
  })).filter((cat) => cat.shortcuts.length > 0)

  return (
    <PageSection>
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle id="keyboard-shortcuts">Keyboard shortcuts</PageSectionTitle>
          <PageSectionDescription>
            Customize keyboard shortcuts. Click a key combo to rebind it.
          </PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <div className="space-y-6">
          {hasOverrides && (
            <div className="flex justify-end">
              <Button
                type="default"
                size="tiny"
                icon={<RotateCcw size={14} />}
                onClick={resetAllShortcuts}
              >
                Reset all to defaults
              </Button>
            </div>
          )}
          {definitionsByCategory.map((cat) => (
            <div key={cat.key}>
              <h3 className="text-sm font-medium text-foreground-light mb-2">{cat.label}</h3>
              <Card>
                {cat.shortcuts.map((def, i) => (
                  <ShortcutRow
                    key={def.id}
                    definition={def}
                    isLast={i === cat.shortcuts.length - 1}
                  />
                ))}
              </Card>
            </div>
          ))}
        </div>
      </PageSectionContent>
    </PageSection>
  )
}
