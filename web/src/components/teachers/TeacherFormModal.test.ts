import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../i18n'
import { nuxtUiStubs } from '../../test/nuxtUiStubs'
import TeacherFormModal from './TeacherFormModal.vue'

describe('TeacherFormModal', () => {
  it('退職日未入力をnullとして保存イベントを通知する', async () => {
    const wrapper = mount(TeacherFormModal, {
      props: { open: true, teacher: null },
      global: { plugins: [i18n], stubs: nuxtUiStubs },
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('佐藤 健一')
    await inputs[1].setValue('kenichi@example.test')
    await inputs[2].setValue('2024-04-01')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          displayName: '佐藤 健一',
          email: 'kenichi@example.test',
          employmentStartDate: '2024-04-01',
          employmentEndDate: null,
        },
      ],
    ])
  })
})
