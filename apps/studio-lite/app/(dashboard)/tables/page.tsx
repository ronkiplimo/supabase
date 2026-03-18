'use client'

import { useState, useCallback } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { TableList, TableDataGrid, CreateTableDialog } from 'platform'
import { AdapterLoader } from '@/lib/AdapterLoader'
import { queryClient } from '@/lib/query-client'

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>('todos')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleTableCreated = useCallback((name: string) => {
    setSelectedTable(name)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AdapterLoader>
        <div className="flex h-full">
          <TableList
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onCreateTable={() => setCreateDialogOpen(true)}
          />
          <div className="flex-1 overflow-hidden">
            {selectedTable ? (
              <TableDataGrid tableName={selectedTable} pageSize={25} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-foreground-light">Select a table to browse its data</p>
              </div>
            )}
          </div>
          <CreateTableDialog
            visible={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={handleTableCreated}
          />
        </div>
      </AdapterLoader>
    </QueryClientProvider>
  )
}
