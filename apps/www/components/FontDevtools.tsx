'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Label_Shadcn_ as Label,
  Popover_Shadcn_ as Popover,
  PopoverContent_Shadcn_ as PopoverContent,
  PopoverTrigger_Shadcn_ as PopoverTrigger,
  Select_Shadcn_ as Select,
  SelectContent_Shadcn_ as SelectContent,
  SelectItem_Shadcn_ as SelectItem,
  SelectTrigger_Shadcn_ as SelectTrigger,
  SelectValue_Shadcn_ as SelectValue,
} from 'ui'

const FONT_OPTIONS = {
  sans: [
    { label: 'KTF Prima', value: 'var(--font-ktf-prima), ui-sans-serif, system-ui, sans-serif' },
    { label: 'System UI', value: 'ui-sans-serif, system-ui, sans-serif' },
    { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    {
      label: 'Helvetica Neue',
      value: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
  ],
  mono: [
    { label: 'Geist Mono', value: 'var(--font-geist-mono), ui-monospace, Menlo, monospace' },
    { label: 'System Mono', value: 'ui-monospace, Menlo, Monaco, monospace' },
    {
      label: 'JetBrains Mono',
      value: '"JetBrains Mono", ui-monospace, monospace',
    },
  ],
} as const

const STORAGE_KEY = 'www-font-devtools'
const STYLE_ID = 'font-devtools-override'

function getStored(): { sans?: string; mono?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function applyOverrides(sans?: string, mono?: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  const rules: string[] = []

  if (sans) {
    rules.push(`:root { --font-sans: ${sans} !important; }`)
  }
  if (mono) {
    rules.push(`:root { --font-mono: ${mono} !important; }`)
  }

  if (rules.length === 0) {
    el?.remove()
    return
  }

  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = rules.join('\n')
}

export function FontDevtools() {
  const [sans, setSans] = useState('')
  const [mono, setMono] = useState('')

  useEffect(() => {
    const stored = getStored()
    if (stored.sans) setSans(stored.sans)
    if (stored.mono) setMono(stored.mono)
    if (stored.sans || stored.mono) {
      applyOverrides(stored.sans, stored.mono)
    }
  }, [])

  const update = useCallback(
    (type: 'sans' | 'mono', value: string) => {
      const nextSans = type === 'sans' ? value : sans
      const nextMono = type === 'mono' ? value : mono
      setSans(nextSans)
      setMono(nextMono)

      applyOverrides(nextSans || undefined, nextMono || undefined)

      const stored: Record<string, string> = {}
      if (nextSans) stored.sans = nextSans
      if (nextMono) stored.mono = nextMono
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    },
    [sans, mono]
  )

  const reset = useCallback(() => {
    setSans('')
    setMono('')
    applyOverrides()
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[99999]">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="outline" size="tiny" className="rounded-full px-2.5 font-mono text-xs">
            Aa
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-60 space-y-3">
          <p className="text-xs font-medium text-foreground-light uppercase tracking-wider">
            Font Devtools
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground-lighter">Sans</Label>
            <Select value={sans || undefined} onValueChange={(v) => update('sans', v)}>
              <SelectTrigger size="small">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.sans.map((f) => (
                  <SelectItem key={f.label} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground-lighter">Mono</Label>
            <Select value={mono || undefined} onValueChange={(v) => update('mono', v)}>
              <SelectTrigger size="small">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.mono.map((f) => (
                  <SelectItem key={f.label} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="default" size="tiny" block onClick={reset}>
            Reset to defaults
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
