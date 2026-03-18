'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import {
  MonacoThemeProvider,
  SqlEditor,
  SnippetSidebar,
  createSqlEditorState,
} from 'platform'
import { AdapterLoader } from '@/lib/AdapterLoader'
import { queryClient } from '@/lib/query-client'

const sqlState = createSqlEditorState([
  {
    id: 'welcome',
    name: 'Welcome',
    sql: `-- Welcome to Supalite SQL Editor!
-- Press Ctrl/Cmd+Enter to run a query.
-- Select text to run only a portion.

SELECT * FROM todos;
`,
  },
  {
    id: 'example-insert',
    name: 'Insert example',
    sql: `INSERT INTO todos (title, completed)
VALUES ('Learn Supalite', 0);
`,
  },
  {
    id: 'example-join',
    name: 'Posts with authors',
    sql: `SELECT
  posts.title,
  posts.published,
  profiles.username AS author
FROM posts
JOIN profiles ON profiles.id = posts.author_id
ORDER BY posts.created_at DESC;
`,
  },
])

export default function SqlPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdapterLoader>
        <MonacoThemeProvider />
        <div className="flex h-full">
          <SnippetSidebar state={sqlState} />
          <div className="flex-1 overflow-hidden">
            <SqlEditor state={sqlState} />
          </div>
        </div>
      </AdapterLoader>
    </QueryClientProvider>
  )
}
