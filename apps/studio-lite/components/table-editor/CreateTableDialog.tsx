'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button, Input_Shadcn_, SidePanel } from 'ui'
import { useAdapter, type ColumnDef } from 'platform'
import { ColumnDefForm, createDefaultColumn, type ColumnDefFormState } from './ColumnDefForm'

export interface CreateTableDialogProps {
  visible: boolean
  onClose: () => void
  onCreated?: (tableName: string) => void
}

export function CreateTableDialog({ visible, onClose, onCreated }: CreateTableDialogProps) {
  const adapter = useAdapter()
  const queryClient = useQueryClient()

  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDefFormState[]>([
    createDefaultColumn(true),
    createDefaultColumn(false),
  ])
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const columnDefs: ColumnDef[] = columns
        .filter((c) => c.name.trim() !== '')
        .map((c) => ({
          name: c.name.trim(),
          dataType: c.dataType,
          isPrimaryKey: c.isPrimaryKey,
          isNullable: c.isNullable,
          isAutoIncrement: c.isAutoIncrement,
          defaultValue: c.defaultValue || null,
        }))

      await adapter.createTable(tableName.trim(), columnDefs)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      onCreated?.(tableName.trim())
      resetForm()
      onClose()
    },
    onError: (err) => {
      setError(String(err))
    },
  })

  const resetForm = useCallback(() => {
    setTableName('')
    setColumns([createDefaultColumn(true), createDefaultColumn(false)])
    setError(null)
  }, [])

  const handleSubmit = () => {
    setError(null)
    if (!tableName.trim()) {
      setError('Table name is required')
      return
    }
    const validColumns = columns.filter((c) => c.name.trim() !== '')
    if (validColumns.length === 0) {
      setError('At least one column is required')
      return
    }
    createMutation.mutate()
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  const addColumn = () => {
    setColumns((prev) => [...prev, createDefaultColumn(false)])
  }

  const updateColumn = (index: number, value: ColumnDefFormState) => {
    setColumns((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <SidePanel
      visible={visible}
      header="Create new table"
      size="large"
      onCancel={handleCancel}
      onConfirm={handleSubmit}
      confirmText="Create table"
      loading={createMutation.isPending}
    >
      <div className="flex flex-col gap-6 py-4">
        <SidePanel.Content>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground-light">Table name</label>
            <Input_Shadcn_
              className="h-9"
              placeholder="e.g. users"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              autoFocus
            />
          </div>
        </SidePanel.Content>

        <SidePanel.Separator />

        <SidePanel.Content>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-foreground-light">Columns</label>
              <Button
                type="text"
                size="tiny"
                icon={<Plus size={14} strokeWidth={1.5} />}
                onClick={addColumn}
              >
                Add column
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {columns.map((col, i) => (
                <ColumnDefForm
                  key={i}
                  value={col}
                  onChange={(v) => updateColumn(i, v)}
                  onRemove={() => removeColumn(i)}
                  canRemove={columns.length > 1}
                />
              ))}
            </div>
          </div>
        </SidePanel.Content>

        {error && (
          <SidePanel.Content>
            <p className="text-sm text-destructive-600">{error}</p>
          </SidePanel.Content>
        )}
      </div>
    </SidePanel>
  )
}
