<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Teacher } from '../../api/generated/types/Teacher'
import { teacherFormSchema } from '../../validation/formSchemas'

export type TeacherFormValues = {
  displayName: string
  email: string | null
  employmentStartDate: string
  employmentEndDate: string | null
}

const props = defineProps<{
  open: boolean
  teacher: Teacher | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [values: TeacherFormValues]
}>()

const { t } = useI18n()

const form = reactive({
  displayName: '',
  email: '',
  employmentStartDate: new Date().toISOString().slice(0, 10),
  employmentEndDate: '',
})

const validationMessage = computed(() => {
  const result = teacherFormSchema.safeParse(form)
  if (result.success) return ''

  return result.error.issues.some((issue) => issue.path[0] === 'displayName')
    ? t('teachers.nameRequired')
    : t('common.inputCheck')
})

const title = computed(() => (props.teacher ? t('teachers.editTitle') : t('teachers.createTitle')))

const description = computed(() => (props.teacher ? t('teachers.editDescription') : t('teachers.createDescription')))

const submitLabel = computed(() => (props.teacher ? t('common.save') : t('common.create')))

function resetForm() {
  form.displayName = props.teacher?.displayName ?? ''
  form.email = props.teacher?.email ?? ''
  form.employmentStartDate = props.teacher?.employmentStartDate ?? new Date().toISOString().slice(0, 10)
  form.employmentEndDate = props.teacher?.employmentEndDate ?? ''
}

function submit() {
  if (validationMessage.value) return

  emit('submit', {
    displayName: form.displayName.trim(),
    email: form.email.trim() || null,
    employmentStartDate: form.employmentStartDate,
    employmentEndDate: form.employmentEndDate || null,
  })
}

watch(() => [props.open, props.teacher], resetForm, { immediate: true })
</script>

<template>
  <UModal :open="open" :title="title" :description="description" @update:open="emit('update:open', $event)">
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('common.name')" required :error="validationMessage || undefined">
          <UInput
            v-model="form.displayName"
            :placeholder="t('teachers.placeholderName')"
            autocomplete="name"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('common.email')">
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('teachers.placeholderEmail')"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('teachers.employmentStartDate')" required>
          <UInput v-model="form.employmentStartDate" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('teachers.employmentEndDate')">
          <UInput v-model="form.employmentEndDate" type="date" class="w-full" />
        </UFormField>
        <UAlert v-if="errorMessage" color="error" :title="t('common.saveFailed')" :description="errorMessage" />
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            type="button"
            :disabled="loading"
            @click="emit('update:open', false)"
          />
          <UButton :label="submitLabel" type="submit" :loading="loading" />
        </div>
      </form>
    </template>
  </UModal>
</template>
