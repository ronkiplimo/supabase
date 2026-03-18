import type {
  ColumnDef,
  ColumnInfo,
  DatabaseAdapter,
  QueryBuilder,
  QueryResult,
  TableInfo,
} from './types'

// ---------------------------------------------------------------------------
// Internal storage types
// ---------------------------------------------------------------------------

interface MockTable {
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  autoIncrementSeq: number
}

// ---------------------------------------------------------------------------
// MockQueryBuilder
// ---------------------------------------------------------------------------

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert'
type Filter = (row: Record<string, unknown>) => boolean

interface SortSpec {
  column: string
  ascending: boolean
}

export class MockQueryBuilder implements QueryBuilder {
  private _operation: Operation = 'select'
  private _columns: string[] | null = null
  private _filters: Filter[] = []
  private _sorts: SortSpec[] = []
  private _limit: number | null = null
  private _offset: number = 0
  private _single: boolean = false
  private _maybeSingle: boolean = false
  private _values: Record<string, unknown>[] = []
  private _onConflict: string | null = null

  constructor(
    private _tableName: string,
    private _getTable: () => MockTable | undefined,
    private _setTable: (table: MockTable) => void
  ) {}

  // --- Core operations ---------------------------------------------------

  select(columns?: string): this {
    this._operation = 'select'
    if (columns && columns !== '*') {
      this._columns = columns.split(',').map((c) => c.trim())
    }
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

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string }
  ): this {
    this._operation = 'upsert'
    this._values = Array.isArray(values) ? values : [values]
    this._onConflict = options?.onConflict ?? null
    return this
  }

  // --- Comparison filters ------------------------------------------------

  eq(column: string, value: unknown): this {
    this._filters.push((row) => row[column] === value)
    return this
  }

  neq(column: string, value: unknown): this {
    this._filters.push((row) => row[column] !== value)
    return this
  }

  gt(column: string, value: unknown): this {
    this._filters.push((row) => (row[column] as number) > (value as number))
    return this
  }

  gte(column: string, value: unknown): this {
    this._filters.push((row) => (row[column] as number) >= (value as number))
    return this
  }

  lt(column: string, value: unknown): this {
    this._filters.push((row) => (row[column] as number) < (value as number))
    return this
  }

  lte(column: string, value: unknown): this {
    this._filters.push((row) => (row[column] as number) <= (value as number))
    return this
  }

  in(column: string, values: unknown[]): this {
    this._filters.push((row) => values.includes(row[column]))
    return this
  }

  is(column: string, value: null | boolean): this {
    if (value === null) {
      this._filters.push((row) => row[column] === null || row[column] === undefined)
    } else {
      this._filters.push((row) => Boolean(row[column]) === value)
    }
    return this
  }

  // --- Pattern matching --------------------------------------------------

  like(column: string, pattern: string): this {
    const regex = patternToRegex(pattern, false)
    this._filters.push((row) => regex.test(String(row[column] ?? '')))
    return this
  }

  ilike(column: string, pattern: string): this {
    const regex = patternToRegex(pattern, true)
    this._filters.push((row) => regex.test(String(row[column] ?? '')))
    return this
  }

  // --- Transforms --------------------------------------------------------

  order(column: string, options?: { ascending?: boolean }): this {
    this._sorts.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  limit(count: number): this {
    this._limit = count
    return this
  }

  range(from: number, to: number): this {
    this._offset = from
    this._limit = to - from + 1
    return this
  }

  single(): this {
    this._single = true
    return this
  }

  maybeSingle(): this {
    this._maybeSingle = true
    return this
  }

  // --- Terminal ----------------------------------------------------------

  async execute(): Promise<QueryResult> {
    const table = this._getTable()
    if (!table) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${this._tableName}" not found` }
    }

    switch (this._operation) {
      case 'select':
        return this._executeSelect(table)
      case 'insert':
        return this._executeInsert(table)
      case 'update':
        return this._executeUpdate(table)
      case 'delete':
        return this._executeDelete(table)
      case 'upsert':
        return this._executeUpsert(table)
    }
  }

  // --- Private execution methods -----------------------------------------

  private _executeSelect(table: MockTable): QueryResult {
    let rows = this._applyFilters(table.rows)
    rows = this._applySorts(rows)
    rows = this._applyPagination(rows)
    rows = this._projectColumns(rows)

    if (this._single && rows.length !== 1) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: rows.length === 0 ? 'No rows found' : 'Multiple rows returned for single()',
      }
    }
    if (this._maybeSingle && rows.length > 1) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: 'Multiple rows returned for maybeSingle()',
      }
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : this._columns ?? table.columns.map((c) => c.name)
    return { columns, rows, rowCount: rows.length }
  }

  private _executeInsert(table: MockTable): QueryResult {
    const inserted: Record<string, unknown>[] = []

    for (const values of this._values) {
      const row = buildRow(table, values)
      table.rows.push(row)
      inserted.push({ ...row })
    }

    this._setTable(table)
    const columns = inserted.length > 0 ? Object.keys(inserted[0]) : []
    return { columns, rows: inserted, rowCount: inserted.length }
  }

  private _executeUpdate(table: MockTable): QueryResult {
    const updates = this._values[0]
    const updated: Record<string, unknown>[] = []

    for (const row of table.rows) {
      if (this._matchesFilters(row)) {
        Object.assign(row, updates)
        updated.push({ ...row })
      }
    }

    this._setTable(table)
    const columns = updated.length > 0 ? Object.keys(updated[0]) : []
    return { columns, rows: updated, rowCount: updated.length }
  }

  private _executeDelete(table: MockTable): QueryResult {
    const deleted: Record<string, unknown>[] = []
    const remaining: Record<string, unknown>[] = []

    for (const row of table.rows) {
      if (this._matchesFilters(row)) {
        deleted.push({ ...row })
      } else {
        remaining.push(row)
      }
    }

    table.rows = remaining
    this._setTable(table)
    const columns = deleted.length > 0 ? Object.keys(deleted[0]) : []
    return { columns, rows: deleted, rowCount: deleted.length }
  }

  private _executeUpsert(table: MockTable): QueryResult {
    const pkColumns = this._onConflict
      ? [this._onConflict]
      : table.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)

    const upserted: Record<string, unknown>[] = []

    for (const values of this._values) {
      const existing = table.rows.find((row) =>
        pkColumns.every((pk) => row[pk] === values[pk])
      )

      if (existing) {
        Object.assign(existing, values)
        upserted.push({ ...existing })
      } else {
        const row = buildRow(table, values)
        table.rows.push(row)
        upserted.push({ ...row })
      }
    }

    this._setTable(table)
    const columns = upserted.length > 0 ? Object.keys(upserted[0]) : []
    return { columns, rows: upserted, rowCount: upserted.length }
  }

  // --- Helpers -----------------------------------------------------------

  private _applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.filter((row) => this._matchesFilters(row))
  }

  private _matchesFilters(row: Record<string, unknown>): boolean {
    return this._filters.every((fn) => fn(row))
  }

  private _applySorts(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    if (this._sorts.length === 0) return rows
    const sorted = [...rows]
    sorted.sort((a, b) => {
      for (const { column, ascending } of this._sorts) {
        const av = a[column]
        const bv = b[column]
        if (av === bv) continue
        if (av === null || av === undefined) return ascending ? -1 : 1
        if (bv === null || bv === undefined) return ascending ? 1 : -1
        const cmp = av < bv ? -1 : 1
        return ascending ? cmp : -cmp
      }
      return 0
    })
    return sorted
  }

  private _applyPagination(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const start = this._offset
    const end = this._limit !== null ? start + this._limit : undefined
    return rows.slice(start, end)
  }

  private _projectColumns(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    if (!this._columns) return rows.map((r) => ({ ...r }))
    return rows.map((row) => {
      const projected: Record<string, unknown> = {}
      for (const col of this._columns!) {
        projected[col] = row[col]
      }
      return projected
    })
  }
}

// ---------------------------------------------------------------------------
// MockDatabaseAdapter
// ---------------------------------------------------------------------------

export class MockDatabaseAdapter implements DatabaseAdapter {
  private _tables = new Map<string, MockTable>()

  // --- Raw SQL -----------------------------------------------------------

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const trimmed = sql.trim()

    try {
      // CREATE TABLE
      const createMatch = trimmed.match(
        /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]+)\)$/i
      )
      if (createMatch) return this._sqlCreateTable(createMatch[1], createMatch[2])

      // DROP TABLE
      const dropMatch = trimmed.match(
        /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?$/i
      )
      if (dropMatch) return this._sqlDropTable(dropMatch[1])

      // INSERT INTO
      const insertMatch = trimmed.match(
        /^INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s+([\s\S]+)$/i
      )
      if (insertMatch) return this._sqlInsert(insertMatch[1], insertMatch[2], insertMatch[3])

      // UPDATE
      const updateMatch = trimmed.match(
        /^UPDATE\s+["']?(\w+)["']?\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i
      )
      if (updateMatch) return this._sqlUpdate(updateMatch[1], updateMatch[2], updateMatch[3])

      // DELETE
      const deleteMatch = trimmed.match(
        /^DELETE\s+FROM\s+["']?(\w+)["']?(?:\s+WHERE\s+([\s\S]+))?$/i
      )
      if (deleteMatch) return this._sqlDelete(deleteMatch[1], deleteMatch[2])

      // SELECT
      const selectMatch = trimmed.match(
        /^SELECT\s+([\s\S]+?)\s+FROM\s+["']?(\w+)["']?(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?$/i
      )
      if (selectMatch) return this._sqlSelect(selectMatch)

      return { columns: [], rows: [], rowCount: 0, error: `Unsupported SQL: ${trimmed}` }
    } catch (e) {
      return { columns: [], rows: [], rowCount: 0, error: String(e) }
    }
  }

  // --- Schema introspection ----------------------------------------------

  async getTables(schema?: string): Promise<TableInfo[]> {
    const s = schema ?? 'main'
    return Array.from(this._tables.entries()).map(([name, table]) => ({
      name,
      schema: s,
      rowCount: table.rows.length,
      comment: null,
    }))
  }

  async getColumns(table: string): Promise<ColumnInfo[]> {
    const t = this._tables.get(table)
    if (!t) return []
    return t.columns.map((col) => ({
      name: col.name,
      dataType: col.dataType,
      isNullable: col.isNullable ?? true,
      isPrimaryKey: col.isPrimaryKey ?? false,
      defaultValue: col.defaultValue ?? null,
      comment: null,
    }))
  }

  // --- DDL ---------------------------------------------------------------

  async createTable(name: string, columns: ColumnDef[]): Promise<void> {
    if (this._tables.has(name)) {
      throw new Error(`Table "${name}" already exists`)
    }
    this._tables.set(name, { columns, rows: [], autoIncrementSeq: 1 })
  }

  async dropTable(name: string): Promise<void> {
    if (!this._tables.has(name)) {
      throw new Error(`Table "${name}" does not exist`)
    }
    this._tables.delete(name)
  }

  // --- Query builder -----------------------------------------------------

  from(table: string): QueryBuilder {
    return new MockQueryBuilder(
      table,
      () => this._tables.get(table),
      (t) => this._tables.set(table, t)
    )
  }

  // --- Seed helper -------------------------------------------------------

  seed(tables: { name: string; columns: ColumnDef[]; rows: Record<string, unknown>[] }[]): void {
    for (const { name, columns, rows } of tables) {
      const maxId = rows.reduce((max, row) => {
        const id = typeof row['id'] === 'number' ? row['id'] : 0
        return Math.max(max, id)
      }, 0)
      this._tables.set(name, { columns, rows: [...rows], autoIncrementSeq: maxId + 1 })
    }
  }

  // --- SQL execution helpers ---------------------------------------------

  private _sqlCreateTable(name: string, columnsDef: string): QueryResult {
    const columns = parseColumnDefs(columnsDef)
    if (this._tables.has(name)) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${name}" already exists` }
    }
    this._tables.set(name, { columns, rows: [], autoIncrementSeq: 1 })
    return { columns: [], rows: [], rowCount: 0 }
  }

  private _sqlDropTable(name: string): QueryResult {
    if (!this._tables.has(name)) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${name}" does not exist` }
    }
    this._tables.delete(name)
    return { columns: [], rows: [], rowCount: 0 }
  }

  private _sqlInsert(tableName: string, columnsPart: string, valuesPart: string): QueryResult {
    const table = this._tables.get(tableName)
    if (!table) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${tableName}" not found` }
    }

    const colNames = columnsPart.split(',').map((c) => c.trim().replace(/["']/g, ''))
    const valueSets = parseValueSets(valuesPart)
    const inserted: Record<string, unknown>[] = []

    for (const vals of valueSets) {
      const row: Record<string, unknown> = {}
      // Fill defaults
      for (const col of table.columns) {
        if (col.isAutoIncrement) {
          row[col.name] = table.autoIncrementSeq++
        } else if (col.defaultValue !== undefined && col.defaultValue !== null) {
          row[col.name] = parseSqlValue(col.defaultValue)
        } else {
          row[col.name] = null
        }
      }
      // Apply provided values
      for (let i = 0; i < colNames.length; i++) {
        row[colNames[i]] = vals[i]
      }
      table.rows.push(row)
      inserted.push({ ...row })
    }

    const columns = inserted.length > 0 ? Object.keys(inserted[0]) : []
    return { columns, rows: inserted, rowCount: inserted.length }
  }

  private _sqlUpdate(tableName: string, setPart: string, wherePart?: string): QueryResult {
    const table = this._tables.get(tableName)
    if (!table) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${tableName}" not found` }
    }

    const assignments = parseAssignments(setPart)
    const filter = wherePart ? buildWhereFilter(wherePart) : () => true
    const updated: Record<string, unknown>[] = []

    for (const row of table.rows) {
      if (filter(row)) {
        for (const [col, val] of Object.entries(assignments)) {
          row[col] = val
        }
        updated.push({ ...row })
      }
    }

    const columns = updated.length > 0 ? Object.keys(updated[0]) : []
    return { columns, rows: updated, rowCount: updated.length }
  }

  private _sqlDelete(tableName: string, wherePart?: string): QueryResult {
    const table = this._tables.get(tableName)
    if (!table) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${tableName}" not found` }
    }

    const filter = wherePart ? buildWhereFilter(wherePart) : () => true
    const deleted: Record<string, unknown>[] = []
    const remaining: Record<string, unknown>[] = []

    for (const row of table.rows) {
      if (filter(row)) {
        deleted.push({ ...row })
      } else {
        remaining.push(row)
      }
    }

    table.rows = remaining
    const columns = deleted.length > 0 ? Object.keys(deleted[0]) : []
    return { columns, rows: deleted, rowCount: deleted.length }
  }

  private _sqlSelect(match: RegExpMatchArray): QueryResult {
    const [, columnsPart, tableName, wherePart, orderPart, limitPart, offsetPart] = match
    const table = this._tables.get(tableName)
    if (!table) {
      return { columns: [], rows: [], rowCount: 0, error: `Table "${tableName}" not found` }
    }

    // Filter
    let rows = wherePart ? table.rows.filter(buildWhereFilter(wherePart)) : [...table.rows]

    // Order
    if (orderPart) {
      const sorts = orderPart.split(',').map((s) => {
        const parts = s.trim().split(/\s+/)
        return { column: parts[0], ascending: (parts[1] || 'asc').toLowerCase() !== 'desc' }
      })
      rows.sort((a, b) => {
        for (const { column, ascending } of sorts) {
          const av = a[column]
          const bv = b[column]
          if (av === bv) continue
          if (av === null || av === undefined) return ascending ? -1 : 1
          if (bv === null || bv === undefined) return ascending ? 1 : -1
          const cmp = av < bv ? -1 : 1
          return ascending ? cmp : -cmp
        }
        return 0
      })
    }

    // Pagination
    const offset = offsetPart ? parseInt(offsetPart, 10) : 0
    const limit = limitPart ? parseInt(limitPart, 10) : undefined
    rows = rows.slice(offset, limit !== undefined ? offset + limit : undefined)

    // Projection
    const selectAll = columnsPart.trim() === '*'
    if (!selectAll) {
      const cols = columnsPart.split(',').map((c) => c.trim().replace(/["']/g, ''))
      rows = rows.map((row) => {
        const projected: Record<string, unknown> = {}
        for (const col of cols) {
          projected[col] = row[col]
        }
        return projected
      })
    } else {
      rows = rows.map((r) => ({ ...r }))
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : (selectAll ? table.columns.map((c) => c.name) : columnsPart.split(',').map((c) => c.trim()))
    return { columns, rows, rowCount: rows.length }
  }
}

// ---------------------------------------------------------------------------
// SQL parsing helpers
// ---------------------------------------------------------------------------

function parseColumnDefs(input: string): ColumnDef[] {
  const columns: ColumnDef[] = []

  // Split on commas that are not inside parentheses
  const parts = splitTopLevel(input)

  for (const part of parts) {
    const trimmed = part.trim()

    // Skip constraints like PRIMARY KEY(...), UNIQUE(...)
    if (/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT)\s*\(/i.test(trimmed)) continue

    const match = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w()]*)/i)
    if (!match) continue

    const name = match[1]
    const dataType = match[2]
    const upper = trimmed.toUpperCase()

    columns.push({
      name,
      dataType,
      isPrimaryKey: upper.includes('PRIMARY KEY'),
      isAutoIncrement: upper.includes('AUTOINCREMENT') || upper.includes('AUTO_INCREMENT'),
      isNullable: !upper.includes('NOT NULL'),
      isUnique: upper.includes('UNIQUE'),
      defaultValue: extractDefault(trimmed),
    })
  }

  return columns
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(') {
      depth++
      current += ch
    } else if (ch === ')') {
      depth--
      current += ch
    } else if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts
}

function extractDefault(colDef: string): string | null {
  const match = colDef.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|NULL|UNIQUE|PRIMARY|CHECK|REFERENCES)|$)/i)
  if (!match) return null
  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

function parseValueSets(input: string): unknown[][] {
  const sets: unknown[][] = []
  // Match each (...) group
  const regex = /\(([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(input)) !== null) {
    sets.push(m[1].split(',').map((v) => parseSqlValue(v.trim())))
  }
  return sets
}

function parseSqlValue(raw: string): unknown {
  if (raw.toUpperCase() === 'NULL') return null
  if (raw.toUpperCase() === 'TRUE') return true
  if (raw.toUpperCase() === 'FALSE') return false
  // String literal
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return raw.slice(1, -1)
  }
  // Number
  const num = Number(raw)
  if (!isNaN(num) && raw !== '') return num
  return raw
}

function parseAssignments(setPart: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const parts = setPart.split(',')
  for (const part of parts) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const col = part.slice(0, eqIdx).trim().replace(/["']/g, '')
    const val = parseSqlValue(part.slice(eqIdx + 1).trim())
    result[col] = val
  }
  return result
}

function buildWhereFilter(where: string): (row: Record<string, unknown>) => boolean {
  // Handle AND-joined conditions
  const conditions = where.split(/\s+AND\s+/i)
  const filters = conditions.map((cond) => parseSingleCondition(cond.trim()))
  return (row) => filters.every((fn) => fn(row))
}

function parseSingleCondition(cond: string): (row: Record<string, unknown>) => boolean {
  // IS NULL / IS NOT NULL
  const isNullMatch = cond.match(/^["']?(\w+)["']?\s+IS\s+NOT\s+NULL$/i)
  if (isNullMatch) {
    const col = isNullMatch[1]
    return (row) => row[col] !== null && row[col] !== undefined
  }

  const isNull = cond.match(/^["']?(\w+)["']?\s+IS\s+NULL$/i)
  if (isNull) {
    const col = isNull[1]
    return (row) => row[col] === null || row[col] === undefined
  }

  // LIKE / ILIKE
  const likeMatch = cond.match(/^["']?(\w+)["']?\s+(NOT\s+)?(I?LIKE)\s+'([^']*)'$/i)
  if (likeMatch) {
    const col = likeMatch[1]
    const negate = !!likeMatch[2]
    const caseInsensitive = likeMatch[3].toUpperCase().startsWith('I')
    const regex = patternToRegex(likeMatch[4], caseInsensitive)
    return (row) => {
      const matches = regex.test(String(row[col] ?? ''))
      return negate ? !matches : matches
    }
  }

  // IN (...)
  const inMatch = cond.match(/^["']?(\w+)["']?\s+(NOT\s+)?IN\s*\(([^)]+)\)$/i)
  if (inMatch) {
    const col = inMatch[1]
    const negate = !!inMatch[2]
    const vals = inMatch[3].split(',').map((v) => parseSqlValue(v.trim()))
    return (row) => {
      const includes = vals.includes(row[col])
      return negate ? !includes : includes
    }
  }

  // Comparison operators: >=, <=, !=, <>, =, >, <
  const cmpMatch = cond.match(/^["']?(\w+)["']?\s*(>=|<=|!=|<>|=|>|<)\s*(.+)$/)
  if (cmpMatch) {
    const col = cmpMatch[1]
    const op = cmpMatch[2]
    const val = parseSqlValue(cmpMatch[3].trim())
    return (row) => {
      const rv = row[col]
      switch (op) {
        case '=':
          return rv === val
        case '!=':
        case '<>':
          return rv !== val
        case '>':
          return (rv as number) > (val as number)
        case '>=':
          return (rv as number) >= (val as number)
        case '<':
          return (rv as number) < (val as number)
        case '<=':
          return (rv as number) <= (val as number)
        default:
          return true
      }
    }
  }

  // Fallback — always true
  return () => true
}

function patternToRegex(pattern: string, caseInsensitive: boolean): RegExp {
  // Convert SQL LIKE pattern to regex: % → .*, _ → .
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regexStr = '^' + escaped.replace(/%/g, '.*').replace(/_/g, '.') + '$'
  return new RegExp(regexStr, caseInsensitive ? 'i' : '')
}

function buildRow(table: MockTable, values: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const col of table.columns) {
    if (col.name in values) {
      row[col.name] = values[col.name]
    } else if (col.isAutoIncrement) {
      row[col.name] = table.autoIncrementSeq++
    } else if (col.defaultValue !== undefined && col.defaultValue !== null) {
      row[col.name] = parseSqlValue(col.defaultValue)
    } else {
      row[col.name] = null
    }
  }
  return row
}
