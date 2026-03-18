import { MockDatabaseAdapter, type ColumnDef } from 'platform'

/**
 * Singleton mock database adapter for studio-lite.
 * Pre-seeded with sample tables so the dashboard has data to work with.
 */

const adapter = new MockDatabaseAdapter()

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const todosColumns: ColumnDef[] = [
  { name: 'id', dataType: 'INTEGER', isPrimaryKey: true, isAutoIncrement: true, isNullable: false },
  { name: 'title', dataType: 'TEXT', isNullable: false },
  { name: 'completed', dataType: 'INTEGER', isNullable: false, defaultValue: '0' },
  { name: 'created_at', dataType: 'TEXT', isNullable: false, defaultValue: 'datetime()' },
]

const profilesColumns: ColumnDef[] = [
  { name: 'id', dataType: 'INTEGER', isPrimaryKey: true, isAutoIncrement: true, isNullable: false },
  { name: 'username', dataType: 'TEXT', isNullable: false, isUnique: true },
  { name: 'display_name', dataType: 'TEXT', isNullable: true },
  { name: 'email', dataType: 'TEXT', isNullable: true },
  { name: 'bio', dataType: 'TEXT', isNullable: true },
  { name: 'created_at', dataType: 'TEXT', isNullable: false },
]

const postsColumns: ColumnDef[] = [
  { name: 'id', dataType: 'INTEGER', isPrimaryKey: true, isAutoIncrement: true, isNullable: false },
  { name: 'author_id', dataType: 'INTEGER', isNullable: false },
  { name: 'title', dataType: 'TEXT', isNullable: false },
  { name: 'body', dataType: 'TEXT', isNullable: true },
  { name: 'published', dataType: 'INTEGER', isNullable: false, defaultValue: '0' },
  { name: 'created_at', dataType: 'TEXT', isNullable: false },
]

adapter.seed([
  {
    name: 'todos',
    columns: todosColumns,
    rows: [
      { id: 1, title: 'Set up Supalite project', completed: 1, created_at: '2026-03-15T10:00:00Z' },
      { id: 2, title: 'Build mock adapter', completed: 1, created_at: '2026-03-16T09:30:00Z' },
      { id: 3, title: 'Implement SQL editor', completed: 0, created_at: '2026-03-17T14:00:00Z' },
      { id: 4, title: 'Add data grid component', completed: 0, created_at: '2026-03-17T14:30:00Z' },
      { id: 5, title: 'Wire up storage browser', completed: 0, created_at: '2026-03-18T08:00:00Z' },
    ],
  },
  {
    name: 'profiles',
    columns: profilesColumns,
    rows: [
      { id: 1, username: 'alice', display_name: 'Alice Chen', email: 'alice@example.com', bio: 'Full-stack developer', created_at: '2026-01-10T12:00:00Z' },
      { id: 2, username: 'bob', display_name: 'Bob Smith', email: 'bob@example.com', bio: null, created_at: '2026-02-05T15:30:00Z' },
      { id: 3, username: 'charlie', display_name: 'Charlie Park', email: 'charlie@example.com', bio: 'Loves SQLite', created_at: '2026-03-01T09:00:00Z' },
    ],
  },
  {
    name: 'posts',
    columns: postsColumns,
    rows: [
      { id: 1, author_id: 1, title: 'Getting started with Supalite', body: 'Supalite is a lightweight alternative to Supabase backed by SQLite.', published: 1, created_at: '2026-03-10T10:00:00Z' },
      { id: 2, author_id: 1, title: 'Query builder patterns', body: 'The supabase-js query builder translates cleanly to SQLite operations.', published: 1, created_at: '2026-03-12T11:00:00Z' },
      { id: 3, author_id: 2, title: 'Draft: Performance tips', body: null, published: 0, created_at: '2026-03-14T16:00:00Z' },
      { id: 4, author_id: 3, title: 'Why SQLite rocks', body: 'SQLite handles most workloads beautifully with zero configuration.', published: 1, created_at: '2026-03-16T09:00:00Z' },
    ],
  },
])

export { adapter }
