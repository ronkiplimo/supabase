'use client'

import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input_Shadcn_,
} from 'ui'
import type { SqlEditorState } from '../SqlEditor/state'
import { useSqlEditorSnapshot } from '../SqlEditor/state'

export interface SnippetSidebarProps {
  state: SqlEditorState
}

export function SnippetSidebar({ state }: SnippetSidebarProps) {
  const snap = useSqlEditorSnapshot(state)
  const snippets = Object.values(snap.snippets)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleNew = useCallback(() => {
    state.addSnippet()
  }, [state])

  const handleSelect = useCallback(
    (id: string) => {
      state.setActiveSnippetId(id)
    },
    [state]
  )

  const handleDelete = useCallback(
    (id: string) => {
      state.removeSnippet(id)
    },
    [state]
  )

  const startRename = useCallback(
    (id: string, currentName: string) => {
      setRenamingId(id)
      setRenameValue(currentName)
    },
    []
  )

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      state.renameSnippet(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, state])

  return (
    <div className="w-64 border-r flex flex-col bg-dash-sidebar flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-xs font-medium text-foreground-light uppercase tracking-wider">
          SQL Snippets
        </span>
        <Button
          type="text"
          size="tiny"
          icon={<Plus size={14} strokeWidth={1.5} />}
          onClick={handleNew}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {snippets.length === 0 ? (
          <div className="px-4 py-3 text-sm text-foreground-lighter">No snippets yet</div>
        ) : (
          <nav className="flex flex-col py-1">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className={cn(
                  'group flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                  snap.activeSnippetId === snippet.id
                    ? 'bg-selection text-foreground'
                    : 'text-foreground-light hover:bg-surface-200 hover:text-foreground'
                )}
                onClick={() => handleSelect(snippet.id)}
              >
                {renamingId === snippet.id ? (
                  <Input_Shadcn_
                    autoFocus
                    className="h-6 text-sm flex-1 mr-1"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') {
                        setRenamingId(null)
                        setRenameValue('')
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate flex-1">{snippet.name}</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-300 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={14} strokeWidth={1.5} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-36">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(snippet.id, snippet.name)
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.5} className="mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(snippet.id)
                      }}
                      className="text-destructive-600"
                    >
                      <Trash2 size={14} strokeWidth={1.5} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
