<script setup lang="ts">
import type { Lesson } from '../../api/generated/types/Lesson'
import { useI18n } from 'vue-i18n'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.vue'

defineProps<{
  open: boolean
  lesson: Lesson | null
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
    :title="t('lessons.deleteTitle')"
    :description="t('lessons.deleteConfirm', { name: lesson?.title })"
    :loading="loading"
    :error-message="errorMessage"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
