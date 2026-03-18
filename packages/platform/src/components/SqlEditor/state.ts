import { proxy, ref, useSnapshot } from 'valtio'
import type { QueryResult } from '../../adapters/types'

export interface Snippet {
  id: string
  name: string
  sql: string
}

export interface SqlEditorState {
  snippets: Record<string, Snippet>
  results: Record<string, QueryResult | null>
  isExecuting: Record<string, boolean>
  activeSnippetId: string | null

  addSnippet(snippet?: Partial<Snippet>): string
  removeSnippet(id: string): void
  renameSnippet(id: string, name: string): void
  setSql(id: string, sql: string): void
  setResult(id: string, result: QueryResult): void
  setIsExecuting(id: string, value: boolean): void
  setActiveSnippetId(id: string): void
}

let counter = 0
function generateId(): string {
  return `snippet_${Date.now()}_${++counter}`
}

export function createSqlEditorState(initialSnippets?: Snippet[]): SqlEditorState {
  const snippets: Record<string, Snippet> = {}
  const results: Record<string, QueryResult | null> = {}
  const isExecuting: Record<string, boolean> = {}

  if (initialSnippets) {
    for (const s of initialSnippets) {
      snippets[s.id] = s
    }
  }

  return proxy<SqlEditorState>({
    snippets,
    results,
    isExecuting,
    activeSnippetId: initialSnippets?.[0]?.id ?? null,

    addSnippet(partial?: Partial<Snippet>) {
      const id = partial?.id ?? generateId()
      const snippet: Snippet = {
        id,
        name: partial?.name ?? 'Untitled query',
        sql: partial?.sql ?? '',
      }
      this.snippets[id] = snippet
      this.activeSnippetId = id
      return id
    },

    removeSnippet(id: string) {
      delete this.snippets[id]
      delete this.results[id]
      delete this.isExecuting[id]
      if (this.activeSnippetId === id) {
        const ids = Object.keys(this.snippets)
        this.activeSnippetId = ids.length > 0 ? ids[ids.length - 1] : null
      }
    },

    renameSnippet(id: string, name: string) {
      if (this.snippets[id]) {
        this.snippets[id].name = name
      }
    },

    setSql(id: string, sql: string) {
      if (this.snippets[id]) {
        this.snippets[id].sql = sql
      }
    },

    setResult(id: string, result: QueryResult) {
      // Use ref() to prevent valtio from deep-proxying large result sets
      this.results[id] = ref(result)
    },

    setIsExecuting(id: string, value: boolean) {
      this.isExecuting[id] = value
    },

    setActiveSnippetId(id: string) {
      this.activeSnippetId = id
    },
  })
}

export function useSqlEditorSnapshot(state: SqlEditorState) {
  return useSnapshot(state)
}
