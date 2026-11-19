import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../i18n'
import { nuxtUiStubs } from '../../test/nuxtUiStubs'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

describe('ConfirmDeleteModal', () => {
  it('キャンセルと削除確認をそれぞれ親へ通知する', async () => {
    const wrapper = mount(ConfirmDeleteModal, {
      props: {
        open: true,
        title: '生徒を削除',
        description: 'この操作は元に戻せません。',
      },
      global: { plugins: [i18n], stubs: nuxtUiStubs },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('処理中は操作ボタンを無効化する', () => {
    const wrapper = mount(ConfirmDeleteModal, {
      props: {
        open: true,
        title: '生徒を削除',
        description: 'この操作は元に戻せません。',
        loading: true,
      },
      global: { plugins: [i18n], stubs: nuxtUiStubs },
    })

    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })
})
