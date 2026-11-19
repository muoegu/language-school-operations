import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CrudTableActions from './CrudTableActions.vue'

const global = {
  stubs: {
    UTooltip: { template: '<div><slot /></div>' },
    UButton: {
      emits: ['click'],
      template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
    },
  },
}

describe('CrudTableActions', () => {
  it('編集と削除の操作を親へ通知する', async () => {
    const wrapper = mount(CrudTableActions, {
      props: { editLabel: '編集', deleteLabel: '削除' },
      global,
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('非表示のときは操作を描画しない', () => {
    const wrapper = mount(CrudTableActions, {
      props: { visible: false, editLabel: '編集', deleteLabel: '削除' },
      global,
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
