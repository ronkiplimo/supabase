/**
 * Core database adapter interface.
 *
 * This is the abstraction boundary between the platform UI components
 * and the underlying database engine (PostgreSQL, SQLite, etc.).
 */

// ---------------------------------------------------------------------------
// Query results
// ---------------------------------------------------------------------------

export interface QueryResult {
  /** Column names in the result set */
  columns: string[]
  /** Row data */
  rows: Record<string, unknown>[]
  /** Number of rows affected (for mutations) */
  rowCount: number
  /** Error message if the query failed */
  error?: string
}

// ---------------------------------------------------------------------------
// Schema introspection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DDL — column definition for CREATE TABLE
// ---------------------------------------------------------------------------

export interface ColumnDef {
  name: string
  dataType: string
  isPrimaryKey?: boolean
  isNullable?: boolean
  defaultValue?: string | null
  isUnique?: boolean
  /** AUTO INCREMENT / AUTOINCREMENT */
  isAutoIncrement?: boolean
}

// ---------------------------------------------------------------------------
// Query builder — mirrors the supabase-js Data API (HIGH priority subset)
// ---------------------------------------------------------------------------

export interface QueryBuilder {
  // --- Core operations ---------------------------------------------------
  select(columns?: string): QueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder
  update(values: Record<string, unknown>): QueryBuilder
  delete(): QueryBuilder
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string }
  ): QueryBuilder

  // --- Comparison filters ------------------------------------------------
  eq(column: string, value: unknown): QueryBuilder
  neq(column: string, value: unknown): QueryBuilder
  gt(column: string, value: unknown): QueryBuilder
  gte(column: string, value: unknown): QueryBuilder
  lt(column: string, value: unknown): QueryBuilder
  lte(column: string, value: unknown): QueryBuilder
  in(column: string, values: unknown[]): QueryBuilder
  is(column: string, value: null | boolean): QueryBuilder

  // --- Pattern matching filters ------------------------------------------
  like(column: string, pattern: string): QueryBuilder
  ilike(column: string, pattern: string): QueryBuilder

  // --- Transforms --------------------------------------------------------
  order(column: string, options?: { ascending?: boolean }): QueryBuilder
  limit(count: number): QueryBuilder
  range(from: number, to: number): QueryBuilder
  single(): QueryBuilder
  maybeSingle(): QueryBuilder

  // --- Terminal ----------------------------------------------------------
  execute(): Promise<QueryResult>
}

// ---------------------------------------------------------------------------
// Database adapter
// ---------------------------------------------------------------------------

export interface DatabaseAdapter {
  /** Execute a raw SQL query and return results */
  query(sql: string, params?: unknown[]): Promise<QueryResult>

  /** List all tables in a given schema */
  getTables(schema?: string): Promise<TableInfo[]>

  /** List all columns for a given table */
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>

  /** Create a new table */
  createTable(name: string, columns: ColumnDef[], schema?: string): Promise<void>

  /** Drop a table */
  dropTable(name: string, schema?: string): Promise<void>

  /** Start a query builder chain on a table (supabase-js style) */
  from(table: string): QueryBuilder
}
