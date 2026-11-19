<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useGetTextbooks,
  usePostTextbooks,
  usePatchTextbooksTextbookid,
  useDeleteTextbooksTextbookid,
} from '../api/generated/hooks'
import type { Textbook } from '../api/generated/types/Textbook'
import type { CreateTextbookRequest } from '../api/generated/types/CreateTextbookRequest'
import TextbookFormModal from '../components/billing/TextbookFormModal.vue'
import TextbookDeleteModal from '../components/billing/TextbookDeleteModal.vue'
import CrudTableActions from '../components/shared/CrudTableActions.vue'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { useAuth } from '../composables/useAuth'
import { formatCurrency } from '../utils/formatters'
import { getApiErrorMessage } from '../composables/useApiError'

const { t, locale } = useI18n()

const { canViewPaymentData, canViewCatalog } = useAuth()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const textbooksQuery = useGetTextbooks({ query: { page: 1, pageSize: 100 } }, { query: { enabled: canViewCatalog } })

const createTextbook = usePostTextbooks()

const updateTextbook = usePatchTextbooksTextbookid()

const deleteTextbook = useDeleteTextbooksTextbookid()

const open = ref(false)

const deleteOpen = ref(false)

const editing = ref<Textbook | null>(null)

const deleting = ref<Textbook | null>(null)

const textbooks = computed(() => textbooksQuery.data.value?.data ?? [])

const fetchErrorMessage = computed(() =>
  textbooksQuery.error.value ? getApiErrorMessage(textbooksQuery.error.value, t('api.serverCheck')) : undefined,
)

const columns = computed(() => [
  { accessorKey: 'title', header: t('textbooks.name') },
  { accessorKey: 'publisher', header: t('textbooks.publisher') },
  { accessorKey: 'priceMinor', header: t('textbooks.price') },
  { accessorKey: 'status', header: t('common.status') },
  { id: 'actions', header: '' },
])
function formatStatus(status: Textbook['status']) {
  return status === 'selling' ? t('common.active') : t('common.inactive')
}
function create() {
  editing.value = null
  createTextbook.reset()
  open.value = true
}
function edit(textbook: Textbook) {
  editing.value = textbook
  updateTextbook.reset()
  open.value = true
}

function openDeleteModal(textbook: Textbook) {
  deleting.value = textbook
  deleteOpen.value = true
}

function submit(values: CreateTextbookRequest) {
  if (editing.value)
    updateTextbook.mutate(
      { path: { textbookId: editing.value.id }, body: values },
      {
        onSuccess: async () => {
          open.value = false
          await textbooksQuery.refetch()
          toast.add({ title: t('toast.updateSuccess', { resource: t('textbooks.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )
  else
    createTextbook.mutate(
      { body: values },
      {
        onSuccess: async () => {
          open.value = false
          await textbooksQuery.refetch()
          toast.add({ title: t('toast.createSuccess', { resource: t('textbooks.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )
}
function confirmDelete() {
  if (!deleting.value) return
  deleteTextbook.mutate(
    { path: { textbookId: deleting.value.id } },
    {
      onSuccess: async () => {
        deleteOpen.value = false
        deleting.value = null
        await textbooksQuery.refetch()
        toast.add({ title: t('toast.deleteSuccess', { resource: t('textbooks.title') }), color: 'success' })
      },
      onError: (error) => deleteErrorToast.show(error),
    },
  )
}
</script>

<template>
  <UContainer class="max-w-6xl">
    <div class="space-y-6">
      <UPageHeader :title="t('textbooks.title')" :description="t('textbooks.description')">
        <template #links>
          <UButton v-if="canViewPaymentData" icon="i-lucide-plus" :label="t('textbooks.add')" @click="create" />
        </template>
      </UPageHeader>
      <UAlert
        v-if="textbooksQuery.isError.value"
        color="error"
        :title="t('api.lessonFetchFailed')"
        :description="fetchErrorMessage"
      />
      <UCard variant="outline">
        <UTable
          :data="textbooks"
          :columns="columns"
          :loading="textbooksQuery.isPending.value || textbooksQuery.isFetching.value"
        >
          <template #priceMinor-cell="{ row }">{{ formatCurrency(row.original.priceMinor, locale) }}</template>
          <template #status-cell="{ row }">
            <UBadge
              :label="formatStatus(row.original.status)"
              :color="row.original.status === 'selling' ? 'success' : 'neutral'"
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
            !textbooksQuery.isPending.value &&
            !textbooksQuery.isFetching.value &&
            !textbooksQuery.isError.value &&
            textbooks.length === 0
          "
          icon="i-lucide-book-open"
          :title="t('common.noData')"
          size="sm"
        />
      </UCard>
      <TextbookFormModal
        :open="open"
        :textbook="editing"
        :loading="createTextbook.isPending.value || updateTextbook.isPending.value"
        @update:open="open = $event"
        @submit="submit"
      />
      <TextbookDeleteModal
        :open="deleteOpen"
        :textbook="deleting"
        @update:open="deleteOpen = $event"
        @confirm="confirmDelete"
      />
    </div>
  </UContainer>
</template>
