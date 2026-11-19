<script setup lang="ts">
withDefaults(
  defineProps<{
    visible?: boolean
    editLabel: string
    deleteLabel: string
  }>(),
  {
    visible: true,
  },
)

const emit = defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <div v-if="visible" class="flex justify-end gap-1">
    <UTooltip :text="editLabel">
      <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" :aria-label="editLabel" @click="emit('edit')" />
    </UTooltip>
    <UTooltip :text="deleteLabel">
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        :aria-label="deleteLabel"
        @click="emit('remove')"
      />
    </UTooltip>
  </div>
</template>
