const MAX_AXIS_LABEL_LENGTH = 12

const ISO_DATE_PATTERN =
  /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const SLASH_DATE_PATTERN =
  /^\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM))?)?$/i
const LONG_DATE_PATTERN =
  /^[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM))?)?$/i

type AxisFormatterOptions = {
  includesTime: boolean
  needsYear: boolean
  singleDay: boolean
}

export const createAxisTickFormatter = (values: unknown[]) => {
  const nonEmptyValues = values.filter(hasVisibleValue)
  const dates = nonEmptyValues
    .map(parseDateLikeValue)
    .filter((value): value is Date => value !== null)

  if (nonEmptyValues.length === 0 || dates.length !== nonEmptyValues.length) {
    return formatAxisTick
  }

  const formatter = new Intl.DateTimeFormat(
    undefined,
    getDateFormatterOptions({
      includesTime: dates.some(hasTimeComponent),
      needsYear: shouldIncludeYear(dates),
      singleDay: isSingleDay(dates),
    })
  )

  return (value: unknown) => {
    const date = parseDateLikeValue(value)
    if (!date) return formatAxisTick(value)

    return formatter.format(date)
  }
}

const formatAxisTick = (value: unknown) => {
  const label = String(value ?? '')
  return label.length > MAX_AXIS_LABEL_LENGTH ? `${label.slice(0, MAX_AXIS_LABEL_LENGTH)}...` : label
}

const getDateFormatterOptions = ({
  includesTime,
  needsYear,
  singleDay,
}: AxisFormatterOptions): Intl.DateTimeFormatOptions => {
  if (includesTime && singleDay) {
    return {
      hour: 'numeric',
      minute: '2-digit',
    }
  }

  return {
    month: 'short',
    day: 'numeric',
    ...(needsYear ? { year: 'numeric' } : {}),
    ...(includesTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
        }
      : {}),
  }
}

const hasVisibleValue = (value: unknown) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

const parseDateLikeValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    return parseTimestamp(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    return parseTimestamp(Number(trimmed))
  }

  if (
    !ISO_DATE_PATTERN.test(trimmed) &&
    !SLASH_DATE_PATTERN.test(trimmed) &&
    !LONG_DATE_PATTERN.test(trimmed)
  ) {
    return null
  }

  const timestamp = Date.parse(trimmed)
  if (Number.isNaN(timestamp)) return null

  return new Date(timestamp)
}

const parseTimestamp = (value: number) => {
  if (!Number.isFinite(value)) return null

  const absoluteValue = Math.abs(value)

  if (absoluteValue >= 1_000_000_000_000 && absoluteValue <= 9_999_999_999_999) {
    return new Date(value)
  }

  if (absoluteValue >= 1_000_000_000 && absoluteValue <= 9_999_999_999) {
    return new Date(value * 1_000)
  }

  return null
}

const hasTimeComponent = (value: Date) =>
  value.getHours() !== 0 ||
  value.getMinutes() !== 0 ||
  value.getSeconds() !== 0 ||
  value.getMilliseconds() !== 0

const shouldIncludeYear = (values: Date[]) => {
  const years = new Set(values.map((value) => value.getFullYear()))

  if (years.size > 1) return true

  return values[0]?.getFullYear() !== new Date().getFullYear()
}

const isSingleDay = (values: Date[]) => {
  const dayKeys = new Set(
    values.map((value) => `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`)
  )

  return dayKeys.size === 1
}
