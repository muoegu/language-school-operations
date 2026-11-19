import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../i18n'
import { nuxtUiStubs } from '../../test/nuxtUiStubs'
import StudentFormModal from './StudentFormModal.vue'

describe('StudentFormModal', () => {
  it('入力値を正規化して保存イベントを通知する', async () => {
    const wrapper = mount(StudentFormModal, {
      props: { open: true, student: null },
      global: { plugins: [i18n], stubs: nuxtUiStubs },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('  山田 花子  ')
    await inputs[1].setValue('hanako@example.test')
    await inputs[2].setValue('初級')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          displayName: '山田 花子',
          email: 'hanako@example.test',
          level: '初級',
        },
      ],
    ])
  })

  it('氏名が空の場合は保存イベントを通知しない', async () => {
    const wrapper = mount(StudentFormModal, {
      props: { open: true, student: null },
      global: { plugins: [i18n], stubs: nuxtUiStubs },
    })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
