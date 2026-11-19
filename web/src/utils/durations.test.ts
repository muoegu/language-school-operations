import { describe, expect, it } from 'vitest'

import { formatJapaneseDuration } from './durations'

describe('formatJapaneseDuration', () => {
  it('開始日を基準に在籍期間を年と月で表示する', () => {
    expect(formatJapaneseDuration('2024-01-15', '2026-11-19')).toBe('2年10ヶ月')
  })

  it('月の途中では翌月として数えない', () => {
    expect(formatJapaneseDuration('2026-01-20', '2026-02-19')).toBe('0年0ヶ月')
  })
})
