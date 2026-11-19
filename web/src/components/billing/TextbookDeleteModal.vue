<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Textbook } from '../../api/generated/types/Textbook'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.vue'

const props = defineProps<{ open: boolean; textbook: Textbook | null }>()

const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()

const { t } = useI18n()

const name = computed(() => props.textbook?.title ?? '')
</script>

<template>
  <ConfirmDeleteModal
    :open="open"
    :title="t('billing.textbookDeleteTitle')"
    :description="t('billing.textbookDeleteConfirm', { name })"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
