<script setup lang="ts">
import type { Student } from '../../api/generated/types/Student'
import { useI18n } from 'vue-i18n'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.vue'

defineProps<{
  open: boolean
  student: Student | null
  loading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <ConfirmDeleteModal
    :open="open"
    :title="t('students.deleteTitle')"
    :description="t('students.deleteConfirm', { name: student?.displayName })"
    :loading="loading"
    :error-message="errorMessage"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
