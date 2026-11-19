import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDate, formatDateTimeYmd, formatTime } from './formatters'

describe('formatDate', () => {
  it('日付のみの文字列をローカル日付として表示する', () => {
    expect(formatDate('2026-11-19')).toBe('2026/11/19')
  })

  it('不正な値と未指定値にはプレースホルダーを返す', () => {
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDate(null)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('日本円を小数点なしで表示する', () => {
    expect(formatCurrency(4500, 'ja-JP')).toBe('￥4,500')
  })
})

describe('formatTime', () => {
  it('指定日時から時刻だけを表示する', () => {
    expect(formatTime(new Date(2026, 10, 19, 13, 5), 'ja-JP')).toBe('13:05')
  })

  it('不正な値にはプレースホルダーを返す', () => {
    expect(formatTime('not-a-date')).toBe('—')
  })
})

describe('formatDateTimeYmd', () => {
  it('日付と時刻を1つの表示値にまとめる', () => {
    expect(formatDateTimeYmd(new Date(2026, 10, 19, 13, 5), 'ja-JP')).toBe('2026/11/19 13:05')
  })
})
