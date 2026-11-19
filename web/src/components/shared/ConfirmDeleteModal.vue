<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  open: boolean
  title: string
  description: string
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
  <UModal :open="open" :title="title" @update:open="emit('update:open', $event)">
    <template #body>
      <div class="space-y-5">
        <div class="space-y-1">
          <p class="text-sm text-muted">{{ description }}</p>
          <p class="text-sm text-muted">{{ t('common.irreversible') }}</p>
        </div>
        <UAlert v-if="errorMessage" color="error" :title="t('common.deleteFailed')" :description="errorMessage" />
        <div class="flex justify-end gap-3">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            :disabled="loading"
            @click="emit('update:open', false)"
          />
          <UButton
            :label="t('common.delete')"
            color="error"
            :loading="loading"
            :disabled="loading"
            @click="emit('confirm')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
