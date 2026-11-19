<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGetClasses, usePostClasses, usePatchClassesClassid, useDeleteClassesClassid } from '../api/generated/hooks'
import type { LessonType } from '../api/generated/types/LessonType'
import type { LessonTypeFormValues } from '../components/billing/LessonPriceFormModal.vue'
import LessonPriceFormModal from '../components/billing/LessonPriceFormModal.vue'
import LessonPriceDeleteModal from '../components/billing/LessonPriceDeleteModal.vue'
import CrudTableActions from '../components/shared/CrudTableActions.vue'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { useAuth } from '../composables/useAuth'
import { formatCurrency } from '../utils/formatters'
import { getApiErrorMessage } from '../composables/useApiError'

const { t, locale } = useI18n()

const { canViewPaymentData, canViewCatalog } = useAuth()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const lessonsQuery = useGetClasses({ query: { page: 1, pageSize: 100 } }, { query: { enabled: canViewCatalog } })

const createLesson = usePostClasses()

const updateLesson = usePatchClassesClassid()

const deleteLesson = useDeleteClassesClassid()

const open = ref(false)

const deleteOpen = ref(false)

const editing = ref<LessonType | null>(null)

const deleting = ref<LessonType | null>(null)

const lessons = computed(() => lessonsQuery.data.value?.data ?? [])

const fetchErrorMessage = computed(() =>
  lessonsQuery.error.value ? getApiErrorMessage(lessonsQuery.error.value, t('api.serverCheck')) : undefined,
)

const columns = computed(() => [
  { accessorKey: 'name', header: t('lessons.name') },
  { accessorKey: 'level', header: t('students.level') },
  { accessorKey: 'durationMinutes', header: t('lessonPrices.duration') },
  { accessorKey: 'priceMinor', header: t('lessonPrices.fee') },
  { accessorKey: 'isActive', header: t('common.status') },
  { id: 'actions', header: '' },
])
function create() {
  editing.value = null
  createLesson.reset()
  open.value = true
}
function edit(lesson: LessonType) {
  editing.value = lesson
  updateLesson.reset()
  open.value = true
}

function openDeleteModal(lesson: LessonType) {
  deleting.value = lesson
  deleteOpen.value = true
}

function submit(values: LessonTypeFormValues) {
  if (editing.value)
    updateLesson.mutate(
      { path: { classId: editing.value.id }, body: values },
      {
        onSuccess: async () => {
          open.value = false
          await lessonsQuery.refetch()
          toast.add({ title: t('toast.updateSuccess', { resource: t('lessonPrices.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )
  else {
    const { isActive: _isActive, ...body } = values
    createLesson.mutate(
      { body },
      {
        onSuccess: async () => {
          open.value = false
          await lessonsQuery.refetch()
          toast.add({ title: t('toast.createSuccess', { resource: t('lessonPrices.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )
  }
}
function confirmDelete() {
  if (!deleting.value) return
  deleteLesson.mutate(
    { path: { classId: deleting.value.id } },
    {
      onSuccess: async () => {
        deleteOpen.value = false
        deleting.value = null
        await lessonsQuery.refetch()
        toast.add({ title: t('toast.deleteSuccess', { resource: t('lessonPrices.title') }), color: 'success' })
      },
      onError: (error) => deleteErrorToast.show(error),
    },
  )
}
</script>

<template>
  <UContainer class="max-w-6xl">
    <div class="space-y-6">
      <UPageHeader :title="t('lessonPrices.title')" :description="t('lessonPrices.description')">
        <template #links>
          <UButton v-if="canViewPaymentData" icon="i-lucide-plus" :label="t('lessonPrices.add')" @click="create" />
        </template>
      </UPageHeader>
      <UAlert
        v-if="lessonsQuery.isError.value"
        color="error"
        :title="t('api.lessonFetchFailed')"
        :description="fetchErrorMessage"
      />
      <UCard variant="outline">
        <UTable
          :data="lessons"
          :columns="columns"
          :loading="lessonsQuery.isPending.value || lessonsQuery.isFetching.value"
        >
          <template #durationMinutes-cell="{ row }">{{ row.original.durationMinutes }}分</template>
          <template #priceMinor-cell="{ row }">{{ formatCurrency(row.original.priceMinor, locale) }}</template>
          <template #isActive-cell="{ row }">
            <UBadge
              :label="row.original.isActive ? t('common.active') : t('common.inactive')"
              :color="row.original.isActive ? 'success' : 'neutral'"
              variant="subtle"
            />
          </template>
          <template #actions-cell="{ row }">
            <CrudTableActions
              :visible="canViewPaymentData"
              :edit-label="t('common.edit')"
              :delete-label="t('common.delete')"
              @edit="edit(row.original)"
              @remove="openDeleteModal(row.original)"
            />
          </template>
        </UTable>
        <UEmpty
          v-if="
            !lessonsQuery.isPending.value &&
            !lessonsQuery.isFetching.value &&
            !lessonsQuery.isError.value &&
            lessons.length === 0
          "
          icon="i-lucide-school"
          :title="t('common.noData')"
          size="sm"
        />
      </UCard>
      <LessonPriceFormModal
        :open="open"
        :lesson="editing"
        :loading="createLesson.isPending.value || updateLesson.isPending.value"
        @update:open="open = $event"
        @submit="submit"
      />
      <LessonPriceDeleteModal
        :open="deleteOpen"
        :lesson="deleting"
        @update:open="deleteOpen = $event"
        @confirm="confirmDelete"
      />
    </div>
  </UContainer>
</template>
