<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Student } from '../../api/generated/types/Student'
import { studentFormSchema } from '../../validation/formSchemas'

export type StudentFormValues = {
  displayName: string
  email: string | null
  level: string | null
}

type StudentFormState = {
  displayName: string
  email: string
  level: string
}

const props = defineProps<{
  open: boolean
  student: Student | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [values: StudentFormValues]
}>()

const { t } = useI18n()

const form = reactive<StudentFormState>({
  displayName: '',
  email: '',
  level: '',
})

const validationMessage = computed(() => {
  const result = studentFormSchema.safeParse(form)
  if (result.success) return ''

  return result.error.issues.some((issue) => issue.path[0] === 'displayName')
    ? t('students.nameRequired')
    : t('common.inputCheck')
})

const title = computed(() => (props.student ? t('students.editTitle') : t('students.createTitle')))

const description = computed(() => (props.student ? t('students.editDescription') : t('students.createDescription')))

const submitLabel = computed(() => (props.student ? t('common.save') : t('common.create')))

function resetForm() {
  form.displayName = props.student?.displayName ?? ''
  form.email = props.student?.email ?? ''
  form.level = props.student?.level ?? ''
}

function submit() {
  if (validationMessage.value) {
    return
  }

  emit('submit', {
    displayName: form.displayName.trim(),
    email: form.email?.trim() || null,
    level: form.level?.trim() || null,
  })
}

watch(() => [props.open, props.student], resetForm, { immediate: true })
</script>

<template>
  <UModal :open="open" :title="title" :description="description" @update:open="emit('update:open', $event)">
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('common.name')" required :error="validationMessage || undefined">
          <UInput
            v-model="form.displayName"
            :placeholder="t('students.placeholderName')"
            autocomplete="name"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('common.email')">
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('students.placeholderEmail')"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('students.level')">
          <UInput v-model="form.level" :placeholder="t('students.placeholderLevel')" class="w-full" />
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
