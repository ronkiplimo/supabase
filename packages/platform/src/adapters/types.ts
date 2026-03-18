/**
 * Core database adapter interface.
 *
 * This is the abstraction boundary between the platform UI components
 * and the underlying database engine (PostgreSQL, SQLite, etc.).
 */

export interface QueryResult {
  /** Column names in the result set */
  columns: string[]
  /** Row data as arrays of values */
  rows: Record<string, unknown>[]
  /** Number of rows affected (for mutations) */
  rowCount: number
  /** Error message if the query failed */
  error?: string
}

export interface TableInfo {
  /** Table name */
  name: string
  /** Schema/namespace the table belongs to */
  schema: string
  /** Estimated row count */
  rowCount: number
  /** Optional comment/description */
  comment?: string | null
}

export interface ColumnInfo {
  /** Column name */
  name: string
  /** Data type as reported by the database */
  dataType: string
  /** Whether the column allows NULL */
  isNullable: boolean
  /** Whether the column is part of the primary key */
  isPrimaryKey: boolean
  /** Default value expression */
  defaultValue?: string | null
  /** Optional comment/description */
  comment?: string | null
}

export interface DatabaseAdapter {
  /** Execute a raw SQL query and return results */
  query(sql: string): Promise<QueryResult>

  /** List all tables in a given schema */
  getTables(schema?: string): Promise<TableInfo[]>

  /** List all columns for a given table */
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
}
