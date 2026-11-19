export const nuxtUiStubs = {
  UAlert: { template: '<div><slot /></div>' },
  UButton: {
    props: ['disabled', 'label', 'loading', 'type'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :type="type ?? \'button\'" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
  UFormField: { template: '<label><slot /></label>' },
  UInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UModal: { template: '<div><slot name="body" /></div>' },
  UTooltip: { template: '<div><slot /></div>' },
}
