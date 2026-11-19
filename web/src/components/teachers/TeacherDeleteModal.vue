<script setup lang="ts">
import type { Teacher } from '../../api/generated/types/Teacher'
import { useI18n } from 'vue-i18n'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.vue'

defineProps<{
  open: boolean
  teacher: Teacher | null
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
    :title="t('teachers.deleteTitle')"
    :description="t('teachers.deleteConfirm', { name: teacher?.displayName })"
    :loading="loading"
    :error-message="errorMessage"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
