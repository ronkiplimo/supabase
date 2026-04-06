import { formatCellValue, formatClipboardValue } from 'components/interfaces/SQLEditor/UtilityPanel/Results.utils'
import { describe, expect, test } from 'vitest'

describe('formatClipboardValue', () => {
  test('returns empty string for null', () => {
    expect(formatClipboardValue(null)).toBe('')
  })

  test('returns JSON string for plain objects', () => {
    expect(formatClipboardValue({ a: 1 })).toBe('{"a":1}')
  })

  test('returns JSON string for arrays', () => {
    expect(formatClipboardValue([1, 2, 3])).toBe('[1,2,3]')
  })

  test('returns the string itself for string values', () => {
    expect(formatClipboardValue('hello')).toBe('hello')
  })

  test('converts numbers to string', () => {
    expect(formatClipboardValue(42)).toBe('42')
  })

  test('converts booleans to string', () => {
    expect(formatClipboardValue(true)).toBe('true')
    expect(formatClipboardValue(false)).toBe('false')
  })

  test('converts undefined to string', () => {
    expect(formatClipboardValue(undefined)).toBe('undefined')
  })
})

describe('formatCellValue', () => {
  test('returns "NULL" for null', () => {
    expect(formatCellValue(null)).toBe('NULL')
  })

  test('returns the string value unchanged', () => {
    expect(formatCellValue('hello')).toBe('hello')
    expect(formatCellValue('')).toBe('')
  })

  test('returns JSON string for plain objects', () => {
    expect(formatCellValue({ key: 'value' })).toBe('{"key":"value"}')
  })

  test('returns JSON string for arrays', () => {
    expect(formatCellValue([1, 2, 3])).toBe('[1,2,3]')
  })

  test('returns JSON string for numbers', () => {
    expect(formatCellValue(42)).toBe('42')
  })

  test('returns JSON string for booleans', () => {
    expect(formatCellValue(true)).toBe('true')
    expect(formatCellValue(false)).toBe('false')
  })
})