import type { Database } from 'sql.js'
import type {
  ColumnDef,
  ColumnInfo,
  DatabaseAdapter,
  QueryBuilder,
  QueryResult,
  TableInfo,
} from './types'

// ---------------------------------------------------------------------------
// SqlJsQueryBuilder — generates SQL and executes via sql.js
// ---------------------------------------------------------------------------

export class SqlJsQueryBuilder implements QueryBuilder {
  private _operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _selectColumns: string = '*'
  private _wheres: string[] = []
  private _whereParams: unknown[] = []
  private _orderClauses: string[] = []
  private _limitVal: number | null = null
  private _offsetVal: number = 0
  private _single = false
  private _maybeSingle = false
  private _values: Record<string, unknown>[] = []
  private _onConflict: string | null = null

  constructor(
    private _table: string,
    private _exec: (sql: string, params?: unknown[]) => QueryResult
  ) {}

  select(columns?: string): this {
    this._operation = 'select'
    if (columns && columns !== '*') this._selectColumns = columns
    return this
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this._operation = 'insert'
    this._values = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: Record<string, unknown>): this {
    this._operation = 'update'
    this._values = [values]
    return this
  }

  delete(): this {
    this._operation = 'delete'
    return this
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): this {
    this._operation = 'upsert'
    this._values = Array.isArray(values) ? values : [values]
    this._onConflict = options?.onConflict ?? null
    return this
  }

  eq(column: string, value: unknown): this { return this._addWhere(column, '=', value) }
  neq(column: string, value: unknown): this { return this._addWhere(column, '!=', value) }
  gt(column: string, value: unknown): this { return this._addWhere(column, '>', value) }
  gte(column: string, value: unknown): this { return this._addWhere(column, '>=', value) }
  lt(column: string, value: unknown): this { return this._addWhere(column, '<', value) }
  lte(column: string, value: unknown): this { return this._addWhere(column, '<=', value) }

  in(column: string, values: unknown[]): this {
    const placeholders = values.map(() => '?').join(', ')
    this._wheres.push(`"${column}" IN (${placeholders})`)
    this._whereParams.push(...values)
    return this
  }

  is(column: string, value: null | boolean): this {
    if (value === null) {
      this._wheres.push(`"${column}" IS NULL`)
    } else {
      this._wheres.push(`"${column}" = ?`)
      this._whereParams.push(value ? 1 : 0)
    }
    return this
  }

  like(column: string, pattern: string): this {
    this._wheres.push(`"${column}" LIKE ?`)
    this._whereParams.push(pattern)
    return this
  }

  ilike(column: string, pattern: string): this {
    this._wheres.push(`"${column}" LIKE ? COLLATE NOCASE`)
    this._whereParams.push(pattern)
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const dir = (options?.ascending ?? true) ? 'ASC' : 'DESC'
    this._orderClauses.push(`"${column}" ${dir}`)
    return this
  }

  limit(count: number): this {
    this._limitVal = count
    return this
  }

  range(from: number, to: number): this {
    this._offsetVal = from
    this._limitVal = to - from + 1
    return this
  }

  single(): this { this._single = true; return this }
  maybeSingle(): this { this._maybeSingle = true; return this }

  async execute(): Promise<QueryResult> {
    switch (this._operation) {
      case 'select': return this._execSelect()
      case 'insert': return this._execInsert()
      case 'update': return this._execUpdate()
      case 'delete': return this._execDelete()
      case 'upsert': return this._execUpsert()
    }
  }

  private _addWhere(column: string, op: string, value: unknown): this {
    this._wheres.push(`"${column}" ${op} ?`)
    this._whereParams.push(value)
    return this
  }

  private _whereClause(): string {
    return this._wheres.length > 0 ? ' WHERE ' + this._wheres.join(' AND ') : ''
  }

  private _execSelect(): QueryResult {
    let sql = `SELECT ${this._selectColumns} FROM "${this._table}"`
    sql += this._whereClause()
    if (this._orderClauses.length > 0) sql += ' ORDER BY ' + this._orderClauses.join(', ')
    if (this._limitVal !== null) sql += ` LIMIT ${this._limitVal}`
    if (this._offsetVal > 0) sql += ` OFFSET ${this._offsetVal}`

    const result = this._exec(sql, this._whereParams)

    if (this._single && result.rows.length !== 1) {
      return { columns: [], rows: [], rowCount: 0, error: result.rows.length === 0 ? 'No rows found' : 'Multiple rows returned for single()' }
    }
    if (this._maybeSingle && result.rows.length > 1) {
      return { columns: [], rows: [], rowCount: 0, error: 'Multiple rows returned for maybeSingle()' }
    }

    return result
  }

  private _execInsert(): QueryResult {
    const results: Record<string, unknown>[] = []
    const allColumns: string[] = []

    for (const row of this._values) {
      const keys = Object.keys(row)
      if (keys.length === 0) {
        // Insert with defaults
        const r = this._exec(`INSERT INTO "${this._table}" DEFAULT VALUES RETURNING *`)
        if (r.error) return r
        results.push(...r.rows)
        if (r.columns.length > 0) allColumns.push(...r.columns)
      } else {
        const placeholders = keys.map(() => '?').join(', ')
        const cols = keys.map((k) => `"${k}"`).join(', ')
        const vals = keys.map((k) => row[k])
        const r = this._exec(`INSERT INTO "${this._table}" (${cols}) VALUES (${placeholders}) RETURNING *`, vals)
        if (r.error) return r
        results.push(...r.rows)
        if (r.columns.length > 0 && allColumns.length === 0) allColumns.push(...r.columns)
      }
    }

    return { columns: allColumns, rows: results, rowCount: results.length }
  }

  private _execUpdate(): QueryResult {
    const updates = this._values[0]
    const keys = Object.keys(updates)
    const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
    const params = [...keys.map((k) => updates[k]), ...this._whereParams]
    const sql = `UPDATE "${this._table}" SET ${setClauses}${this._whereClause()} RETURNING *`
    return this._exec(sql, params)
  }

  private _execDelete(): QueryResult {
    const sql = `DELETE FROM "${this._table}"${this._whereClause()} RETURNING *`
    return this._exec(sql, this._whereParams)
  }

  private _execUpsert(): QueryResult {
    const results: Record<string, unknown>[] = []
    const allColumns: string[] = []

    for (const row of this._values) {
      const keys = Object.keys(row)
      const cols = keys.map((k) => `"${k}"`).join(', ')
      const placeholders = keys.map(() => '?').join(', ')
      const vals = keys.map((k) => row[k])
      const conflict = this._onConflict ? `"${this._onConflict}"` : keys.map((k) => `"${k}"`)[0]
      const updateClauses = keys.map((k) => `"${k}" = excluded."${k}"`).join(', ')

      const sql = `INSERT INTO "${this._table}" (${cols}) VALUES (${placeholders}) ON CONFLICT(${conflict}) DO UPDATE SET ${updateClauses} RETURNING *`
      const r = this._exec(sql, vals)
      if (r.error) return r
      results.push(...r.rows)
      if (r.columns.length > 0 && allColumns.length === 0) allColumns.push(...r.columns)
    }

    return { columns: allColumns, rows: results, rowCount: results.length }
  }
}

// ---------------------------------------------------------------------------
// SqlJsDatabaseAdapter
// ---------------------------------------------------------------------------

export class SqlJsDatabaseAdapter implements DatabaseAdapter {
  private _db: Database

  constructor(db: Database) {
    this._db = db
  }

  /**
   * Create an adapter from an initialized sql.js instance.
   * Usage:
   *   const SQL = await initSqlJs({ locateFile: ... })
   *   const db = new SQL.Database()
   *   const adapter = new SqlJsDatabaseAdapter(db)
   */

  private _execSync(sql: string, params?: unknown[]): QueryResult {
    try {
      const stmt = this._db.prepare(sql)
      if (params && params.length > 0) {
        stmt.bind(params)
      }

      const columns: string[] = []
      const rows: Record<string, unknown>[] = []

      while (stmt.step()) {
        if (columns.length === 0) {
          columns.push(...stmt.getColumnNames())
        }
        const values = stmt.get()
        const row: Record<string, unknown> = {}
        for (let i = 0; i < columns.length; i++) {
          row[columns[i]] = values[i]
        }
        rows.push(row)
      }

      // For statements that don't return rows (INSERT/UPDATE/DELETE without RETURNING)
      if (columns.length === 0) {
        // Try to get column names from the statement
        const names = stmt.getColumnNames()
        if (names.length > 0) columns.push(...names)
      }

      stmt.free()

      const changes = this._db.getRowsModified()

      return {
        columns,
        rows,
        rowCount: rows.length > 0 ? rows.length : changes,
      }
    } catch (e: any) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: e?.message ?? String(e),
      }
    }
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    // Handle multiple statements separated by semicolons
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (statements.length === 0) {
      return { columns: [], rows: [], rowCount: 0 }
    }

    // Execute all statements, return the result of the last one
    let lastResult: QueryResult = { columns: [], rows: [], rowCount: 0 }
    for (const stmt of statements) {
      lastResult = this._execSync(stmt, statements.length === 1 ? params : undefined)
      if (lastResult.error) return lastResult
    }

    return lastResult
  }

  async getTables(): Promise<TableInfo[]> {
    const result = this._execSync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    if (result.error) return []

    return result.rows.map((row) => {
      const countResult = this._execSync(`SELECT COUNT(*) as cnt FROM "${row.name}"`)
      const count = countResult.rows[0]?.cnt ?? 0
      return {
        name: row.name as string,
        schema: 'main',
        rowCount: count as number,
        comment: null,
      }
    })
  }

  async getColumns(table: string): Promise<ColumnInfo[]> {
    const result = this._execSync(`PRAGMA table_info("${table}")`)
    if (result.error) return []

    return result.rows.map((row) => ({
      name: row.name as string,
      dataType: (row.type as string) || 'TEXT',
      isNullable: row.notnull === 0,
      isPrimaryKey: row.pk === 1,
      defaultValue: row.dflt_value as string | null,
      comment: null,
    }))
  }

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    const colDefs = columns.map((col) => {
      let def = `"${col.name}" ${col.dataType}`
      if (col.isPrimaryKey) def += ' PRIMARY KEY'
      if (col.isAutoIncrement) def += ' AUTOINCREMENT'
      if (col.isNullable === false && !col.isPrimaryKey) def += ' NOT NULL'
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`
      if (col.isUnique) def += ' UNIQUE'
      return def
    })

    const sql = `CREATE TABLE "${name}" (${colDefs.join(', ')})`
    const result = this._execSync(sql)
    if (result.error) throw new Error(result.error)
  }

  async dropTable(name: string): Promise<void> {
    const result = this._execSync(`DROP TABLE "${name}"`)
    if (result.error) throw new Error(result.error)
  }

  from(table: string): QueryBuilder {
    return new SqlJsQueryBuilder(table, (sql, params) => this._execSync(sql, params))
  }

  /**
   * Seed tables with initial data. Runs CREATE TABLE + INSERT statements.
   */
  seed(tables: { name: string; columns: ColumnDef[]; rows: Record<string, unknown>[] }[]): void {
    for (const { name, columns, rows } of tables) {
      // Create table
      const colDefs = columns.map((col) => {
        let def = `"${col.name}" ${col.dataType}`
        if (col.isPrimaryKey) def += ' PRIMARY KEY'
        if (col.isAutoIncrement) def += ' AUTOINCREMENT'
        if (col.isNullable === false && !col.isPrimaryKey) def += ' NOT NULL'
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`
        if (col.isUnique) def += ' UNIQUE'
        return def
      })
      this._execSync(`CREATE TABLE IF NOT EXISTS "${name}" (${colDefs.join(', ')})`)

      // Insert rows
      for (const row of rows) {
        const keys = Object.keys(row)
        const cols = keys.map((k) => `"${k}"`).join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const vals = keys.map((k) => row[k])
        this._execSync(`INSERT INTO "${name}" (${cols}) VALUES (${placeholders})`, vals)
      }
    }
  }
}
