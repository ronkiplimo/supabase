'use client'

import { Loader2Icon, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  Button_Shadcn_ as Button,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  TextArea_Shadcn_ as TextArea,
  type ChartConfig,
} from 'ui'

import type {
  AgentChatSql,
  AgentChatSqlChartConfig,
  AgentChatSqlEditorRender,
  AgentChatSqlPoint,
  AgentChatSqlRunners,
  AgentChatSqlRunResult,
} from '../types'
import { createAxisTickFormatter } from './chart-format'

type ToolSqlState =
  | { status: 'idle'; rows: AgentChatSqlPoint[]; error?: undefined }
  | { status: 'running'; rows: AgentChatSqlPoint[]; error?: undefined }
  | { status: 'success'; rows: AgentChatSqlPoint[]; error?: undefined }
  | { status: 'error'; rows: AgentChatSqlPoint[]; error: string }

const DEFAULT_STATE: ToolSqlState = { status: 'idle', rows: [] }
const SQL_CHART_SERIES_COLORS = [
  'hsl(var(--foreground-lighter))',
  'hsl(var(--warning-default))',
  'hsl(var(--destructive-default))',
  'hsl(var(--foreground-muted))',
  'hsl(var(--brand-500))',
  'hsl(var(--warning-500))',
]

export const ToolSql = ({
  sql,
  sqlRunners,
  renderEditor,
}: {
  sql: AgentChatSql
  sqlRunners?: AgentChatSqlRunners
  renderEditor?: AgentChatSqlEditorRender
}) => {
  const [value, setValue] = useState(sql.defaultValue ?? '')
  const [state, setState] = useState<ToolSqlState>(DEFAULT_STATE)
  const runner = sql.source === 'logs' ? sqlRunners?.logs : sqlRunners?.database

  useEffect(() => {
    setValue(sql.defaultValue ?? '')
    setState(DEFAULT_STATE)
  }, [sql])

  const chartState = useMemo(
    () => getChartState(state.rows, sql.chartConfig),
    [state.rows, sql.chartConfig]
  )

  const handleRun = async () => {
    if (!runner) return

    setState({ status: 'running', rows: [] })

    try {
      const result = await runner({ ...sql, sql: value })
      setState(normalizeRunResult(result))
    } catch (error) {
      setState({
        status: 'error',
        rows: [],
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  const editor = renderEditor ? (
    renderEditor({
      payload: sql,
      value,
      disabled: state.status === 'running' || !runner,
      onChange: setValue,
      onRun: handleRun,
    })
  ) : (
    <TextArea
      className="min-h-[220px] resize-none border-0 bg-transparent px-4 py-4 pb-16 pr-28 font-mono text-sm shadow-none focus-visible:ring-0"
      disabled={state.status === 'running' || !runner}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          void handleRun()
        }
      }}
      value={value}
    />
  )

  return (
    <div className="w-full my-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-t-2xl border border-b-0 bg-muted/50 [&_.monaco-editor]:!bg-muted/25 [&_.monaco-editor]:!outline-none [&_.monaco-editor]:!shadow-none [&_.monaco-editor.focused]:!outline-none [&_.monaco-editor.focused]:!shadow-none [&_.monaco-editor_.margin]:!bg-muted/25 [&_.monaco-editor_.monaco-editor-background]:!bg-muted/25 [&_.overflow-guard]:!outline-none [&_.overflow-guard]:!shadow-none [&_.overflow-guard]:!border-0">
        <div className="relative">
          {editor}
          <Button
            aria-label="Run SQL query"
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full shadow-sm"
            disabled={!runner || state.status === 'running'}
            onClick={() => void handleRun()}
            size="icon"
            type="button"
            variant="secondary"
          >
            {state.status === 'running' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
          </Button>
        </div>
      </div>

      <div className={'-mt-4 overflow-hidden rounded-2xl border bg-surface-100 z-10 relative'}>
        {state.status === 'idle' && (
          <p className="px-4 py-4 text-sm text-foreground-light">
            {!runner ? 'SQL execution is unavailable in this client.' : 'Click Run to execute your query.'}
          </p>
        )}

        {state.status === 'running' && <p className="px-4 py-4 font-mono text-sm">Running...</p>}

        {state.status === 'error' && (
          <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-sm">{state.error}</pre>
        )}

        {state.status === 'success' && state.rows.length === 0 && (
          <p className="px-4 py-4 font-mono text-sm">Success. No rows returned</p>
        )}

        {state.status === 'success' &&
          state.rows.length > 0 &&
          (sql.view ?? 'table') === 'table' && <SqlResultsTable rows={state.rows} />}

        {state.status === 'success' &&
          state.rows.length > 0 &&
          (sql.view ?? 'table') === 'chart' && <SqlResultsChart state={chartState} />}
      </div>
    </div>
  )
}

const SqlResultsTable = ({ rows }: { rows: AgentChatSqlPoint[] }) => {
  const columns = Object.keys(rows[0] ?? {})

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-b-0">
              {columns.map((column) => (
                <td key={column} className="max-w-[240px] px-4 py-3 align-top font-mono text-xs">
                  {formatCellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SqlResultsChart = ({
  state,
}: {
  state:
    | {
        status: 'ready'
        data: Array<Record<string, string | number>>
        type: 'bar' | 'stacked-bar'
        xKey: string
        yKeys: string[]
      }
    | { status: 'missing-config' }
    | { status: 'invalid-y-axis'; keys: string[] }
}) => {
  if (state.status === 'missing-config') {
    return (
      <div className="flex h-[220px] items-center justify-center px-4 text-sm text-foreground-light">
        Add `xKey` and `yKey` or `yKeys` to render the chart.
      </div>
    )
  }

  if (state.status === 'invalid-y-axis') {
    return (
      <div className="flex h-[220px] items-center justify-center px-4 text-sm text-foreground-light">
        Chart series must be numeric: {state.keys.join(', ')}.
      </div>
    )
  }

  if (state.status !== 'ready') {
    return null
  }

  const series = state.yKeys.map((key, index) => ({
    key,
    id: getChartSeriesId(key, index),
    label: formatChartLabel(key),
    color: SQL_CHART_SERIES_COLORS[index % SQL_CHART_SERIES_COLORS.length],
  }))

  const chartConfig = Object.fromEntries(
    series.map((entry) => [
      entry.id,
      {
        label: entry.label,
        color: entry.color,
      },
    ])
  ) satisfies ChartConfig

  const chartData = state.data.map((point) => ({
    [state.xKey]: point[state.xKey],
    ...Object.fromEntries(series.map((entry) => [entry.id, Number(point[entry.key]) || 0])),
  }))
  const formatXAxisTick = createAxisTickFormatter(state.data.map((point) => point[state.xKey]))

  return (
    <div className="px-4 py-4">
      <ChartContainer className="h-[240px] w-full" config={chartConfig}>
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={state.xKey}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={formatXAxisTick}
          />
          <ChartTooltip
            content={<ChartTooltipContent hideLabel={state.type === 'stacked-bar'} />}
          />
          {state.type === 'stacked-bar' ? <ChartLegend content={<ChartLegendContent />} /> : null}
          {series.map((entry) => {
            return (
              <Bar
                key={entry.id}
                dataKey={entry.id}
                stackId={state.type === 'stacked-bar' ? 'sql-stack' : undefined}
                fill={`var(--color-${entry.id})`}
              />
            )
          })}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

const normalizeRunResult = (result: AgentChatSqlRunResult): ToolSqlState => {
  if (result.error) {
    return { status: 'error', rows: result.rows ?? [], error: result.error }
  }

  return { status: 'success', rows: result.rows ?? [] }
}

const getChartState = (
  rows: AgentChatSqlPoint[],
  chartConfig?: AgentChatSqlChartConfig
):
  | {
      status: 'ready'
      data: AgentChatSqlChartRow[]
      type: 'bar' | 'stacked-bar'
      xKey: string
      yKeys: string[]
    }
  | { status: 'missing-config' }
  | { status: 'invalid-y-axis'; keys: string[] } => {
  const type = chartConfig?.type ?? 'bar'
  const yKeys: string[] =
    type === 'stacked-bar' ? chartConfig?.yKeys ?? [] : chartConfig?.yKey ? [chartConfig.yKey] : []

  if (!chartConfig?.xKey || yKeys.length === 0) {
    return { status: 'missing-config' }
  }

  const data: AgentChatSqlChartRow[] = rows.map((row) => {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        yKeys.includes(key) ? Number(value) : formatChartValue(value),
      ])
    )

    return normalized
  })

  const invalidKeys = yKeys.filter((key) => data.some((row) => Number.isNaN(Number(row[key]))))

  if (invalidKeys.length > 0) {
    return { status: 'invalid-y-axis', keys: invalidKeys }
  }

  return {
    status: 'ready',
    data,
    type,
    xKey: chartConfig.xKey,
    yKeys,
  }
}

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

type AgentChatSqlChartRow = Record<string, string | number>

const formatChartValue = (value: unknown): string | number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

const formatChartLabel = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const getChartSeriesId = (value: string, index: number) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${normalized.length > 0 ? normalized : 'series'}-${index + 1}`
}
