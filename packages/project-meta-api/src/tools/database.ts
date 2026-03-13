import { tool } from 'ai'
import { z } from 'zod'
import { executeProjectQuery } from '../db.js'

export const databaseTools = {
  listSchemas: tool({
    description: 'List all schemas in the project database.',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await executeProjectQuery<{ schema_name: string }>(
        `SELECT schema_name FROM information_schema.schemata
         WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         ORDER BY schema_name`
      )
      return { schemas: rows.map((r) => r.schema_name) }
    },
  }),

  listTables: tool({
    description: 'List tables in the project database.',
    inputSchema: z.object({
      schemas: z.array(z.string()).optional().describe('Schemas to list. Defaults to ["public"].'),
    }),
    execute: async ({ schemas = ['public'] }) => {
      const list = schemas.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')
      const rows = await executeProjectQuery(
        `SELECT table_schema, table_name, table_type
         FROM information_schema.tables
         WHERE table_schema IN (${list})
         ORDER BY table_schema, table_name`
      )
      return { tables: rows }
    },
  }),

  describeTable: tool({
    description: 'Get columns, types, and constraints for a table.',
    inputSchema: z.object({
      schema: z.string().default('public').describe('Schema name.'),
      table: z.string().describe('Table name.'),
    }),
    execute: async ({ schema, table }) => {
      const s = schema.replace(/'/g, "''")
      const t = table.replace(/'/g, "''")
      const [columns, constraints] = await Promise.all([
        executeProjectQuery(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = '${s}' AND table_name = '${t}'
           ORDER BY ordinal_position`
        ),
        executeProjectQuery(
          `SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
           WHERE tc.table_schema = '${s}' AND tc.table_name = '${t}'
           ORDER BY tc.constraint_type, kcu.column_name`
        ),
      ])
      return { schema, table, columns, constraints }
    },
  }),

  executeSql: tool({
    description: 'Execute a SQL query against the project database. Use for reads and writes.',
    inputSchema: z.object({
      query: z.string().describe('SQL query to execute.'),
    }),
    execute: async ({ query }) => {
      const rows = await executeProjectQuery(query)
      return { rows, count: rows.length }
    },
  }),

  listExtensions: tool({
    description: 'List installed PostgreSQL extensions in the project database.',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await executeProjectQuery(
        `SELECT name, default_version, installed_version, comment
         FROM pg_available_extensions
         WHERE installed_version IS NOT NULL
         ORDER BY name`
      )
      return { extensions: rows }
    },
  }),

  listMigrations: tool({
    description: 'List applied Supabase migrations for the project.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const rows = await executeProjectQuery(
          `SELECT version, name, created_at
           FROM supabase_migrations.schema_migrations
           ORDER BY version`
        )
        return { migrations: rows }
      } catch {
        return { migrations: [], note: 'supabase_migrations schema not found' }
      }
    },
  }),
}
