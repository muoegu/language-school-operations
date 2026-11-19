<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LessonType } from '../../api/generated/types/LessonType'
import type { CreateLessonTypeRequest } from '../../api/generated/types/CreateLessonTypeRequest'
import { lessonPriceFormSchema } from '../../validation/formSchemas'

export type LessonTypeFormValues = CreateLessonTypeRequest & { isActive: boolean }
const props = defineProps<{ open: boolean; lesson: LessonType | null; loading?: boolean }>()

const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [values: LessonTypeFormValues] }>()

const { t } = useI18n()

const form = reactive({ name: '', level: '', durationMinutes: 60, priceMinor: 0, isActive: true })

const error = computed(() => {
  const result = lessonPriceFormSchema.safeParse(form)
  if (result.success) return ''

  return result.error.issues.some((issue) => issue.path[0] === 'name')
    ? t('lessonPrices.nameRequired')
    : t('common.inputCheck')
})

const title = computed(() => (props.lesson ? t('lessonPrices.editTitle') : t('lessonPrices.createTitle')))

const submitLabel = computed(() => (props.lesson ? t('common.save') : t('common.create')))

function resetForm() {
  form.name = props.lesson?.name ?? ''
  form.level = props.lesson?.level ?? ''
  form.durationMinutes = props.lesson?.durationMinutes ?? 60
  form.priceMinor = props.lesson?.priceMinor ?? 0
  form.isActive = props.lesson?.isActive ?? true
}
function submit() {
  if (error.value) return
  emit('submit', {
    name: form.name.trim(),
    level: form.level.trim() || '全レベル',
    durationMinutes: Math.max(1, Number(form.durationMinutes) || 1),
    priceMinor: Math.max(0, Number(form.priceMinor) || 0),
    currency: 'JPY',
    isActive: form.isActive,
  })
}
watch(() => [props.open, props.lesson], resetForm, { immediate: true })
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="t('lessonPrices.formDescription')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('lessons.name')" required :error="error || undefined"
          ><UInput v-model="form.name" class="w-full"
        /></UFormField>
        <UFormField :label="t('students.level')"><UInput v-model="form.level" class="w-full" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('lessonPrices.duration')"
            ><UInput v-model.number="form.durationMinutes" type="number" min="1" class="w-full" /></UFormField
          ><UFormField :label="t('lessonPrices.fee')"
            ><UInput v-model.number="form.priceMinor" type="number" min="0" class="w-full"
          /></UFormField>
        </div>
        <UFormField :label="t('common.status')"
          ><USwitch v-model="form.isActive" :label="form.isActive ? t('common.active') : t('common.inactive')"
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
