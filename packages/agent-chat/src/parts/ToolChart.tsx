'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  CardDescription,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from 'ui'

import type { AgentChatChart } from '../types'
import { createAxisTickFormatter } from './chart-format'

const CHART_SERIES_ID = 'series-1'

export const ToolChart = ({ primaryText, secondaryText, data, xAxis, yAxis }: AgentChatChart) => {
  const validData =
    data && xAxis && yAxis
      ? data.filter(
          (point) =>
            Object.prototype.hasOwnProperty.call(point, xAxis) &&
            Object.prototype.hasOwnProperty.call(point, yAxis)
        )
      : []

  const formatXAxisTick =
    xAxis && yAxis ? createAxisTickFormatter(validData.map((point) => point[xAxis])) : undefined

  const chartConfig = {
    [CHART_SERIES_ID]: {
      label: yAxis ? formatChartLabel(yAxis) : 'Value',
      color: 'hsl(var(--brand-default))',
    },
  } satisfies ChartConfig

  const chartData =
    xAxis && yAxis
      ? validData.map((point) => ({
          [xAxis]: String(point[xAxis] ?? ''),
          [CHART_SERIES_ID]: Number(point[yAxis]) || 0,
        }))
      : []

  return (
    <div className="w-full my-8">
      {(primaryText || secondaryText) && (
        <div className="mx-auto max-w-4xl rounded-t-2xl border border-b-0 bg-muted/50 px-4 py-4 pb-8">
          <div className="space-y-1">
            {primaryText ? <div className="heading-default">{primaryText}</div> : null}
            {secondaryText ? (
              <CardDescription className="text-sm text-foreground-light">
                {secondaryText}
              </CardDescription>
            ) : null}
          </div>
        </div>
      )}
      <div
        className={
          primaryText || secondaryText
            ? '-mt-4 overflow-hidden rounded-2xl border bg-surface-100 z-10 relative'
            : 'overflow-hidden rounded-t-2xl border bg-background'
        }
      >
        {chartData.length > 0 && xAxis && yAxis ? (
          <div className="px-4 py-4">
            <ChartContainer className="h-[240px] w-full" config={chartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey={xAxis}
                  tickFormatter={formatXAxisTick}
                  tickLine={false}
                  tickMargin={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey={CHART_SERIES_ID} fill={`var(--color-${CHART_SERIES_ID})`} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center px-4 text-sm text-foreground-light">
            Loading chart data...
          </div>
        )}
      </div>
    </div>
  )
}

const formatChartLabel = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
