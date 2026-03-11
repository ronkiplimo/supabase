import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STUDIO_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(STUDIO_DIR, 'data')
const OUTPUT_DIR = path.join(STUDIO_DIR, 'generated')

type QueryAnalysis = {
  tables: string[]
  schemas: string[]
  type: 'read' | 'write' | 'metadata' | 'unknown'
}

type ExtractedQuery = {
  name: string
  sql: string
  analysis?: QueryAnalysis
  purpose?: string | null
}

function analyzeSql(sql: string): QueryAnalysis {
  const tables = new Set<string>()
  const schemas = new Set<string>()

  const tableRegex =
    /\b(from|join|update|into|delete\s+from)\s+([a-zA-Z0-9_."]+)/gi

  for (const match of sql.matchAll(tableRegex)) {
    const table = match[2].replace(/"/g, '')
    tables.add(table)

    if (table.includes('.')) {
      schemas.add(table.split('.')[0])
    }
  }

  let type: QueryAnalysis['type'] = 'unknown'
  const lower = sql.toLowerCase()

  if (lower.includes('pg_') || lower.includes('information_schema')) {
    type = 'metadata'
  } else if (lower.startsWith('select') || lower.startsWith('with')) {
    type = 'read'
  } else if (
    lower.startsWith('insert') ||
    lower.startsWith('update') ||
    lower.startsWith('delete')
  ) {
    type = 'write'
  }

  return {
    tables: [...tables],
    schemas: [...schemas],
    type,
  }
}

function extractTaggedSql(content: string): ExtractedQuery[] {
  const results: ExtractedQuery[] = []
  const regex = /\/\*\s*SQL\s*\*\/\s*`([\s\S]*?)`/g

  for (const match of content.matchAll(regex)) {
    const sql = match[1].trim()

    const before = content.slice(0, match.index)
    const exportMatch = before.match(/export\s+const\s+(\w+)/g)?.pop()

    let name = 'unknown'
    if (exportMatch) {
      const m = exportMatch.match(/export\s+const\s+(\w+)/)
      if (m) name = m[1]
    }

    results.push({ name, sql })
  }

  return results
}

function extractTemplateSql(content: string): ExtractedQuery[] {
  const results: ExtractedQuery[] = []
  const templateRegex = /`([\s\S]*?)`/g

  for (const match of content.matchAll(templateRegex)) {
    const sql = match[1].trim()

    const looksLikeSql =
      /\b(select|insert|update|delete|with)\b/i.test(sql) &&
      /\b(from|into|delete)\b/i.test(sql)

    if (!looksLikeSql) continue

    const before = content.slice(0, match.index)
    const exportMatch = before.match(/export\s+const\s+(\w+)/g)?.pop()

    let name = 'unknown'
    if (exportMatch) {
      const m = exportMatch.match(/export\s+const\s+(\w+)/)
      if (m) name = m[1]
    }

    results.push({ name, sql })
  }

  return results
}

function dedupeQueries(queries: ExtractedQuery[]): ExtractedQuery[] {
  const seen = new Set<string>()

  return queries.filter((q) => {
    const key = `${q.name}::${q.sql}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractAllSql(content: string): ExtractedQuery[] {
  return [
    ...extractTaggedSql(content),
    ...extractTemplateSql(content)
  ]
}

function findSqlTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...findSqlTsFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.sql.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

async function summarizeSql(name: string, sql: string) {
  const prompt = `
Explain the purpose of this SQL query in 1–2 sentences for a developer engineer.

Query name: ${name}

SQL:
${sql}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You explain SQL queries used in a database dashboard.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return completion.choices[0].message.content?.trim()
}

function generateMarkdown(data: any[]): string {
  const lines: string[] = []

  lines.push('# Supabase Studio SQL Query Inventory')
  lines.push('')
  lines.push('Generated automatically from `apps/studio/data/**/*.sql.ts`.')
  lines.push('')

  for (const file of data) {
    lines.push(`## ${file.file}`)
    lines.push('')

    if (!file.queries.length) {
      lines.push('_No SQL queries detected._')
      lines.push('')
      continue
    }

    for (const query of file.queries) {
      lines.push(`### ${query.name}`)
      lines.push('')
      lines.push(`**Type:** ${query.analysis.type}`)
      lines.push('')

      if (query.analysis.tables.length) {
        lines.push('**Tables touched:**')
        for (const table of query.analysis.tables) {
          lines.push(`- ${table}`)
        }
        lines.push('')
      }

      if (query.purpose) {
        lines.push('**Purpose:**')
        lines.push(query.purpose)
        lines.push('')
      }

      lines.push('```sql')
      lines.push(query.sql)
      lines.push('```')
      lines.push('')
    }
  }

  return lines.join('\n')
}

async function main() {
  const files = findSqlTsFiles(DATA_DIR)

  const output: any[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')

    const queries = dedupeQueries(extractAllSql(content)).map((q) => ({
      ...q,
      analysis: analyzeSql(q.sql),
      purpose: null,
    }))

    console.log("Queries found:", queries.length)

    for (const q of queries) {
      try {
        q.purpose = await summarizeSql(q.name, q.sql)
        console.log("Summarized:", q.name)
      } catch (err) {
        console.error("AI ERROR:", err)
        q.purpose = null
      }
    }

    output.push({
      file: path.relative(STUDIO_DIR, file),
      extractionStatus: queries.length > 0 ? 'ok' : 'no_sql_detected',
      queries,
    })
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'studio-sql-inventory.json'),
    JSON.stringify(output, null, 2)
  )

  const markdown = generateMarkdown(output)

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'studio-sql-inventory.md'),
    markdown
  )

  console.log(
    `Generated documentation for ${output.length} SQL files`
  )
}

main()