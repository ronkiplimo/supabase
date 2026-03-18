'use client'

import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { useCallback, useRef, useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'ui'
import { useAdapter } from '../../context/AdapterContext'
import type { SqlEditorState } from './state'
import { useSqlEditorSnapshot } from './state'
import { SqlEditorToolbar } from './SqlEditorToolbar'
import { SqlResultsPanel } from './SqlResultsPanel'

export interface SqlEditorProps {
  state: SqlEditorState
}

export function SqlEditor({ state }: SqlEditorProps) {
  const adapter = useAdapter()
  const snap = useSqlEditorSnapshot(state)
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  const activeId = snap.activeSnippetId
  const snippet = activeId ? snap.snippets[activeId] : null
  const result = activeId ? snap.results[activeId] ?? null : null
  const isExecuting = activeId ? snap.isExecuting[activeId] ?? false : false

  const executeQuery = useCallback(async () => {
    if (!activeId || !editorRef.current) return

    const editor = editorRef.current
    const selection = editor.getSelection()
    const model = editor.getModel()

    let sql: string | undefined
    if (selection && !selection.isEmpty() && model) {
      sql = model.getValueInRange(selection)
    }
    if (!sql) {
      sql = editor.getValue()
    }
    if (!sql?.trim()) return

    state.setIsExecuting(activeId, true)
    try {
      const result = await adapter.query(sql)
      state.setResult(activeId, result)
    } catch (err) {
      state.setResult(activeId, {
        columns: [],
        rows: [],
        rowCount: 0,
        error: String(err),
      })
    } finally {
      state.setIsExecuting(activeId, false)
    }

    // Refocus editor after execution
    editor.focus()
  }, [activeId, adapter, state])

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      // Selection tracking
      editor.onDidChangeCursorSelection((e) => {
        const sel = e.selection
        const isEmpty = sel.startLineNumber === sel.endLineNumber && sel.startColumn === sel.endColumn
        setHasSelection(!isEmpty)
      })

      // Ctrl/Cmd+Enter → Run query
      editor.addAction({
        id: 'run-query',
        label: 'Run Query',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          executeQuery()
        },
      })

      // Ctrl/Cmd+S → Save (update sql in state)
      editor.addAction({
        id: 'save-query',
        label: 'Save Query',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: (ed) => {
          if (activeId) {
            state.setSql(activeId, ed.getValue())
          }
        },
      })
    },
    [executeQuery, activeId, state]
  )

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeId && value !== undefined) {
        state.setSql(activeId, value)
      }
    },
    [activeId, state]
  )

  if (!snippet) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-foreground-lighter">
        Create or select a snippet to start
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SqlEditorToolbar hasSelection={hasSelection} isExecuting={isExecuting} onRun={executeQuery} />
      <ResizablePanelGroup orientation="vertical" className="flex-1">
        <ResizablePanel defaultSize="50" minSize="20">
          <Editor
            language="sql"
            theme="supabase"
            value={snippet.sql}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              tabSize: 2,
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'on',
              padding: { top: 8 },
              scrollBeyondLastLine: false,
              lineDecorationsWidth: 0,
              automaticLayout: true,
            }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="50" minSize="15">
          <SqlResultsPanel result={result} isExecuting={isExecuting} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
