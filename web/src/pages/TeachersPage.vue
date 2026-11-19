<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'

import {
  useDeleteTeachersTeacherid,
  useGetTeachers,
  usePatchTeachersTeacherid,
  usePostTeachers,
} from '../api/generated/hooks'
import type { Teacher } from '../api/generated/types/Teacher'
import TeacherDeleteModal from '../components/teachers/TeacherDeleteModal.vue'
import TeacherFormModal, { type TeacherFormValues } from '../components/teachers/TeacherFormModal.vue'
import CrudTableActions from '../components/shared/CrudTableActions.vue'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { useAuth } from '../composables/useAuth'
import { getApiErrorMessage } from '../composables/useApiError'
import { formatJapaneseDuration } from '../utils/durations'

const { canViewTeachers, canManageTeachers } = useAuth()

const teachersQuery = useGetTeachers({}, { query: { enabled: canViewTeachers } })

const {
  data: teachersData,
  isError: teachersIsError,
  isPending: teachersIsPending,
  isFetching: teachersIsFetching,
} = teachersQuery

const teachersIsLoading = computed(() => teachersIsPending.value || teachersIsFetching.value)

const createTeacher = usePostTeachers()

const updateTeacher = usePatchTeachersTeacherid()

const deleteTeacher = useDeleteTeachersTeacherid()

const { t } = useI18n()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const isFormOpen = ref(false)

const isDeleteOpen = ref(false)

const editingTeacher = ref<Teacher | null>(null)

const deletingTeacher = ref<Teacher | null>(null)

type TeacherTableRow = Teacher & { employmentStatusLabel: string; employmentDurationLabel: string }

const columns = computed<TableColumn<TeacherTableRow>[]>(() => [
  { accessorKey: 'displayName', header: t('common.name') },
  { accessorKey: 'email', header: t('common.email') },
  { accessorKey: 'employmentStatusLabel', header: t('common.status') },
  { accessorKey: 'employmentDurationLabel', header: t('teachers.employmentDuration') },
  { id: 'actions', header: '' },
])

const teachers = computed<TeacherTableRow[]>(() =>
  (teachersData.value?.data ?? []).map((teacher) => ({
    ...teacher,
    employmentStatusLabel: teacher.employmentEndDate ? t('teachers.retired') : t('teachers.employed'),
    employmentDurationLabel: formatJapaneseDuration(
      teacher.employmentStartDate,
      teacher.employmentEndDate ?? undefined,
    ),
  })),
)

const formLoading = computed(() => createTeacher.isPending.value || updateTeacher.isPending.value)

const formError = computed(() =>
  createTeacher.error.value || updateTeacher.error.value ? t('common.inputCheck') : undefined,
)

const deleteLoading = computed(() => deleteTeacher.isPending.value)

const deleteError = computed(() => (deleteTeacher.error.value ? t('common.retry') : undefined))

const fetchErrorMessage = computed(() =>
  teachersQuery.error.value ? getApiErrorMessage(teachersQuery.error.value, t('api.serverCheck')) : undefined,
)

function openCreateModal() {
  editingTeacher.value = null
  createTeacher.reset()
  isFormOpen.value = true
}
function openEditModal(teacher: Teacher) {
  editingTeacher.value = teacher
  updateTeacher.reset()
  isFormOpen.value = true
}
function closeFormModal() {
  isFormOpen.value = false
  editingTeacher.value = null
  createTeacher.reset()
  updateTeacher.reset()
}
function openDeleteModal(teacher: Teacher) {
  deletingTeacher.value = teacher
  deleteTeacher.reset()
  isDeleteOpen.value = true
}
function closeDeleteModal() {
  isDeleteOpen.value = false
  deletingTeacher.value = null
  deleteTeacher.reset()
}

function handleTeacherSubmit(values: TeacherFormValues) {
  if (editingTeacher.value) {
    updateTeacher.mutate(
      { path: { teacherId: editingTeacher.value.id }, body: values },
      {
        onSuccess: async () => {
          closeFormModal()
          await teachersQuery.refetch()
          toast.add({ title: t('toast.updateSuccess', { resource: t('teachers.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )

    return
  }
  createTeacher.mutate(
    { body: values },
    {
      onSuccess: async () => {
        closeFormModal()
        await teachersQuery.refetch()
        toast.add({ title: t('toast.createSuccess', { resource: t('teachers.title') }), color: 'success' })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}

function handleTeacherDelete() {
  if (!deletingTeacher.value) return
  deleteTeacher.mutate(
    { path: { teacherId: deletingTeacher.value.id } },
    {
      onSuccess: async () => {
        closeDeleteModal()
        await teachersQuery.refetch()
        toast.add({ title: t('toast.deleteSuccess', { resource: t('teachers.title') }), color: 'success' })
      },
      onError: (error) => deleteErrorToast.show(error),
    },
  )
}
</script>

<template>
  <UContainer class="max-w-6xl">
    <div class="space-y-6">
      <UPageHeader :title="t('teachers.title')" :description="t('teachers.description')">
        <template #links>
          <UButton v-if="canManageTeachers" :label="t('teachers.add')" icon="i-lucide-plus" @click="openCreateModal" />
        </template>
      </UPageHeader>

      <UAlert
        v-if="teachersIsError"
        color="error"
        :title="t('api.teacherFetchFailed')"
        :description="fetchErrorMessage"
      />
      <UCard variant="outline">
        <UTable :data="teachers" :columns="columns" :loading="teachersIsLoading">
          <template #actions-cell="{ row }">
            <CrudTableActions
              :visible="canManageTeachers"
              :edit-label="t('common.edit')"
              :delete-label="t('common.delete')"
              @edit="openEditModal(row.original)"
              @remove="openDeleteModal(row.original)"
            />
          </template>
        </UTable>
        <UEmpty
          v-if="!teachersIsLoading && !teachersIsError && teachers.length === 0"
          icon="i-lucide-graduation-cap"
          :title="t('teachers.noData')"
          size="sm"
        />
      </UCard>

      <TeacherFormModal
        :open="isFormOpen"
        :teacher="editingTeacher"
        :loading="formLoading"
        :error-message="formError"
        @update:open="(open) => (open ? (isFormOpen = true) : closeFormModal())"
        @submit="handleTeacherSubmit"
      />
      <TeacherDeleteModal
        :open="isDeleteOpen"
        :teacher="deletingTeacher"
        :loading="deleteLoading"
        :error-message="deleteError"
        @update:open="(open) => (open ? (isDeleteOpen = true) : closeDeleteModal())"
        @confirm="handleTeacherDelete"
      />
    </div>
  </UContainer>
</template>
