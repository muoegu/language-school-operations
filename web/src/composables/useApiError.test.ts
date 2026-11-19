import { describe, expect, it } from 'vitest'

import { getApiErrorCode, getApiErrorMessage } from './useApiError'

describe('API error helpers', () => {
  it('APIエラーコードを取得する', () => {
    expect(getApiErrorCode({ data: { error: { code: 'FORBIDDEN' } } })).toBe('FORBIDDEN')
  })

  it('APIエラーメッセージを取得する', () => {
    expect(getApiErrorMessage({ data: { error: { message: '権限がありません' } } }, '通信に失敗しました')).toBe(
      '権限がありません',
    )
  })

  it('メッセージがない場合はフォールバックを返す', () => {
    expect(getApiErrorMessage(undefined, '通信に失敗しました')).toBe('通信に失敗しました')
  })
})
