<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Textbook } from '../../api/generated/types/Textbook'
import type { CreateTextbookRequest } from '../../api/generated/types/CreateTextbookRequest'
import { textbookFormSchema } from '../../validation/formSchemas'

const props = defineProps<{ open: boolean; textbook: Textbook | null; loading?: boolean }>()

const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [values: CreateTextbookRequest] }>()

const { t } = useI18n()

const form = reactive({ title: '', publisher: '', priceMinor: 0, status: 'selling' as CreateTextbookRequest['status'] })

const error = computed(() => {
  const result = textbookFormSchema.safeParse(form)
  if (result.success) return ''

  return result.error.issues.some((issue) => issue.path[0] === 'title')
    ? t('textbooks.nameRequired')
    : t('common.inputCheck')
})

const title = computed(() => (props.textbook ? t('textbooks.editTitle') : t('textbooks.createTitle')))

const submitLabel = computed(() => (props.textbook ? t('common.save') : t('common.create')))

const statusOptions = [
  { label: '販売中', value: '販売中' },
  { label: '取扱終了', value: '取扱終了' },
]

function resetForm() {
  form.title = props.textbook?.title ?? ''
  form.publisher = props.textbook?.publisher ?? ''
  form.priceMinor = props.textbook?.priceMinor ?? 0
  form.status = props.textbook?.status ?? 'selling'
}
function submit() {
  if (error.value) return
  emit('submit', {
    title: form.title.trim(),
    publisher: form.publisher.trim(),
    priceMinor: Math.max(0, Number(form.priceMinor) || 0),
    currency: 'JPY',
    status: form.status,
  })
}
watch(() => [props.open, props.textbook], resetForm, { immediate: true })
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="t('textbooks.formDescription')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('textbooks.name')" required :error="error || undefined"
          ><UInput v-model="form.title" class="w-full"
        /></UFormField>
        <UFormField :label="t('textbooks.publisher')"><UInput v-model="form.publisher" class="w-full" /></UFormField>
        <UFormField :label="t('textbooks.price')"
          ><UInput v-model.number="form.priceMinor" type="number" min="0" class="w-full"
        /></UFormField>
        <UFormField :label="t('common.status')"
          ><USelectMenu v-model="form.status" :items="statusOptions" value-key="value" class="w-full"
        /></UFormField>
        <div class="flex justify-end gap-3">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :label="t('common.cancel')"
            :disabled="loading"
            @click="emit('update:open', false)"
          /><UButton type="submit" :label="submitLabel" :loading="loading" :disabled="loading" />
        </div>
      </form>
    </template>
  </UModal>
</template>
