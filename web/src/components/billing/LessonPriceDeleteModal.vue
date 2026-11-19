<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LessonType } from '../../api/generated/types/LessonType'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.vue'

const props = defineProps<{ open: boolean; lesson: LessonType | null }>()

const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()

const { t } = useI18n()

const name = computed(() => props.lesson?.name ?? '')
</script>

<template>
  <ConfirmDeleteModal
    :open="open"
    :title="t('billing.lessonDeleteTitle')"
    :description="t('billing.lessonDeleteConfirm', { name })"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
