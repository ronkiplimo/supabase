import { tool } from 'ai'
import { z } from 'zod'

const LOGS_SQL_RENDER_GUIDANCE = `For logs queries, use the Supabase logs SQL dialect and UNNEST nested metadata arrays before accessing child fields.

Available log tables: edge_logs, function_logs, function_edge_logs, postgres_logs, auth_logs, realtime_logs, storage_logs.

Example - edge_logs:
select datetime(timestamp) as ts, request.method, request.path, response.status_code
from edge_logs as t
cross join unnest(t.metadata) as metadata
cross join unnest(metadata.request) as request
cross join unnest(metadata.response) as response
order by timestamp desc
limit 25

Example - function_edge_logs:
select datetime(timestamp) as ts, request.method, request.pathname, response.status_code
from function_edge_logs as t
cross join unnest(t.metadata) as metadata
cross join unnest(metadata.request) as request
cross join unnest(metadata.response) as response
order by timestamp desc
limit 25

Example - postgres_logs:
select datetime(timestamp) as ts, parsed.error_severity, parsed.user_name, parsed.query
from postgres_logs as t
cross join unnest(t.metadata) as metadata
cross join unnest(metadata.parsed) as parsed
order by timestamp desc
limit 25`

const rowSchema = z.object({
  primaryText: z.string().describe('Primary label for the row.'),
  secondaryText: z.string().optional().describe('Secondary information.'),
  actions: z
    .array(
      z.object({
        label: z.string().describe('Action menu text.'),
        prompt: z.string().describe('Prompt to send back when selected.'),
      })
    )
    .optional()
    .describe('Optional quick-action list.'),
})

const pullRequestSchema = z.object({
  title: z.string().min(1).describe('Pull request title.'),
  url: z.string().url().describe('Direct pull request URL.'),
  number: z.number().int().positive().optional().describe('Pull request number.'),
  repository: z.string().optional().describe('Repository name, for example owner/repo.'),
  status: z
    .enum(['open', 'merged', 'closed', 'draft'])
    .optional()
    .describe('Current pull request status.'),
  branch: z.string().optional().describe('Source branch name.'),
  baseBranch: z.string().optional().describe('Target branch name.'),
  summary: z
    .string()
    .optional()
    .describe('Optional short summary of what the pull request changes.'),
})

const chartDataPointSchema = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .refine((p) => Object.keys(p).length > 0, {
    message: 'Each data point must have at least one key/value pair.',
  })

const chartSchema = z
  .object({
    primaryText: z.string().describe('Short summary of what the chart shows.'),
    secondaryText: z
      .string()
      .optional()
      .describe('Optional insight or takeaway shown under the summary.'),
    data: z.array(chartDataPointSchema).min(1).describe('Data points to plot.'),
    xAxis: z.string().min(1).describe('Key in each data point to use for X-axis labels.'),
    yAxis: z.string().min(1).describe('Key in each data point to use for bar height values.'),
  })
  .superRefine(({ data, xAxis, yAxis }, ctx) => {
    data.forEach((point, i) => {
      if (!(xAxis in point))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data', i, xAxis],
          message: `Missing x-axis key "${xAxis}".`,
        })
      if (!(yAxis in point))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data', i, yAxis],
          message: `Missing y-axis key "${yAxis}".`,
        })
    })
  })

const sqlChartConfigSchema = z
  .object({
    type: z
      .enum(['bar', 'stacked-bar'])
      .optional()
      .describe('Chart type. Defaults to bar. Use stacked-bar to stack multiple numeric series.'),
    xKey: z.string().min(1).describe('Key in each result row to use for X-axis labels.'),
    yKey: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Required for bar charts. Key in each result row to use for numeric Y-axis values.'
      ),
    yKeys: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe(
        'Required for stacked-bar charts. Keys in each result row to use for stacked numeric series.'
      ),
  })
  .superRefine((input, ctx) => {
    const type = input.type ?? 'bar'

    if (type === 'bar' && !input.yKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yKey'],
        message: 'yKey is required when chart type is bar.',
      })
    }

    if (type === 'stacked-bar' && !input.yKeys?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yKeys'],
        message: 'yKeys is required when chart type is stacked-bar.',
      })
    }
  })

const baseSqlSchema = z.object({
  projectRef: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional project reference. Clients may ignore this and use their current project context.'
    ),
  defaultValue: z
    .string()
    .optional()
    .describe(
      'Initial SQL shown in the editor. Start every generated query with a short SQL line comment using `--` that explains what the query does.'
    ),
  autorun: z
    .boolean()
    .optional()
    .describe(
      'Whether the client should automatically run the query on load. Use only for safe read-only queries.'
    ),
  view: z.enum(['table', 'chart']).optional().describe('Default output view.'),
  chartConfig: sqlChartConfigSchema
    .optional()
    .describe(
      'Chart configuration for chart view. Use `type: "stacked-bar"` with `yKeys` to stack multiple numeric columns.'
    ),
})

const sqlSchema = baseSqlSchema
  .extend({
    source: z
      .enum(['sql', 'logs'])
      .describe(
        'Which SQL runner the client should use. Use logs for Supabase logs SQL queries that may require UNNEST joins.'
      ),
    connectionString: z
      .string()
      .nullable()
      .optional()
      .describe('Optional encrypted connection string override for database SQL.'),
    dateRange: z
      .object({
        from: z.string().min(1).describe('ISO start timestamp for logs queries.'),
        to: z.string().min(1).describe('ISO end timestamp for logs queries.'),
      })
      .optional()
      .describe('Required when source is logs.'),
  })
  .superRefine((input, ctx) => {
    if (input.source === 'logs' && !input.dateRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRange'],
        message: 'dateRange is required when source is logs.',
      })
    }
  })

export const renderTools = {
  renderRow: tool({
    description: 'Render a list of rows summarizing records, with optional follow-up actions.',
    inputSchema: z.object({ rows: z.array(rowSchema).min(1) }),
    execute: async () => ({ success: true, message: 'Rows have been shown to the user' }),
  }),

  renderPullRequest: tool({
    description:
      'Render a pull request card. Use this when your response is associated with a specific pull request so the user gets a direct structured link.',
    inputSchema: pullRequestSchema,
    execute: async (input) => ({
      success: true,
      message: 'Pull request has been shown to the user',
      ...input,
    }),
  }),

  renderChart: tool({
    description:
      'Render a bar chart summarizing metrics for the user. Use `primaryText` for a concise summary of what the chart shows and `secondaryText` for optional insights.',
    inputSchema: chartSchema,
    execute: async (input) => ({
      success: true,
      message: 'Chart has been shown to the user',
      ...input,
    }),
  }),

  renderSql: tool({
    description: `Render an interactive SQL editor that the user can run on the client.

Always make the first line of \`defaultValue\` a short SQL line comment using \`--\` that explains the query in plain language. Do this instead of providing a separate title or description field.

For chart output:
- Use \`chartConfig: { type: "bar", xKey, yKey }\` for a standard bar chart.
- Use \`chartConfig: { type: "stacked-bar", xKey, yKeys: ["series_a", "series_b"] }\` for a stacked bar chart.
- Alias SQL result columns to readable names because chart legends use the returned column names.
- Set \`autorun: true\` when the query is safe and read-only, such as logs queries or non-mutating SQL like \`select\`, \`with ... select\`, \`explain\`, or \`show\`.
- Leave \`autorun\` false or omitted for any mutating or potentially destructive SQL.

When a response is associated with a specific pull request, call \`renderPullRequest\` with the PR metadata instead of only mentioning the URL in text.

${LOGS_SQL_RENDER_GUIDANCE}`,
    inputSchema: sqlSchema,
    execute: async (input) => ({
      success: true,
      message: 'SQL editor has been shown to the user',
      ...input,
    }),
  }),
}
