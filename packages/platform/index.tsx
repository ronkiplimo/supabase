// Adapter types
export type {
  ColumnDef,
  ColumnInfo,
  DatabaseAdapter,
  QueryBuilder,
  QueryResult,
  TableInfo,
} from './src/adapters/types'

// Adapters
export { MockDatabaseAdapter, MockQueryBuilder } from './src/adapters/mock'
export { SqlJsDatabaseAdapter, SqlJsQueryBuilder } from './src/adapters/sqljs'

// Context
export { AdapterProvider, useAdapter } from './src/context/AdapterContext'

// Table editor components
export { TableList } from './src/components/TableList'
export { TableDataGrid } from './src/components/TableDataGrid'
export { CreateTableDialog } from './src/components/CreateTableDialog'

// SQL editor components
export { SqlEditor, MonacoThemeProvider, createSqlEditorState, useSqlEditorSnapshot } from './src/components/SqlEditor'
export type { SqlEditorState, Snippet } from './src/components/SqlEditor'
export { SnippetSidebar } from './src/components/SnippetSidebar'
