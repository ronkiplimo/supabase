'use client'

import { useMonaco } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

function getSupabaseTheme(theme: string) {
  const isDark = theme.includes('dark')
  return {
    base: isDark ? ('vs-dark' as const) : ('vs' as const),
    inherit: true,
    rules: [
      { token: '', background: isDark ? '1f1f1f' : 'f0f0f0' },
      {
        token: '',
        background: isDark ? '1f1f1f' : 'f0f0f0',
        foreground: isDark ? 'd4d4d4' : '444444',
      },
      { token: 'string.sql', foreground: '24b47e' },
      { token: 'comment', foreground: '666666' },
      { token: 'predefined.sql', foreground: isDark ? 'D4D4D4' : '444444' },
    ],
    colors: { 'editor.background': isDark ? '#1f1f1f' : '#f0f0f0' },
  }
}

export function MonacoThemeProvider() {
  const monaco = useMonaco()
  const { resolvedTheme } = useTheme()

  useMemo(() => {
    if (monaco && resolvedTheme) {
      monaco.editor.defineTheme('supabase', getSupabaseTheme(resolvedTheme))
    }
  }, [resolvedTheme, monaco])

  return null
}
