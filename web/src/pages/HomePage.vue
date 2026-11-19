<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'

import {
  useDeleteStudentsStudentid,
  useGetMeStudents,
  useGetStudents,
  usePatchStudentsStudentid,
  usePostStudents,
} from '../api/generated/hooks'
import type { Student } from '../api/generated/types/Student'
import StudentDeleteModal from '../components/students/StudentDeleteModal.vue'
import StudentFormModal, { type StudentFormValues } from '../components/students/StudentFormModal.vue'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { useAuth } from '../composables/useAuth'
import { getApiErrorMessage } from '../composables/useApiError'
import { formatDate } from '../utils/formatters'

const { isRepresentative, isTeacher, isStaff } = useAuth()

const studentsQuery = useGetStudents(
  {},
  { query: { enabled: computed(() => isRepresentative.value || isStaff.value) } },
)

const assignedStudentsQuery = useGetMeStudents({ query: { enabled: isTeacher } })

const { data: studentsData } = studentsQuery

const createStudent = usePostStudents()

const updateStudent = usePatchStudentsStudentid()

const deleteStudent = useDeleteStudentsStudentid()

const { t } = useI18n()

const router = useRouter()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const isFormOpen = ref(false)

const isDeleteOpen = ref(false)

const editingStudent = ref<Student | null>(null)

const deletingStudent = ref<Student | null>(null)

type StudentTableRow = Student & {
  activeLabel: string
  createdAtLabel: string
}

const studentsIsError = computed(() =>
  isTeacher.value ? assignedStudentsQuery.isError.value : studentsQuery.isError.value,
)

const studentsIsFetching = computed(() =>
  isTeacher.value
    ? assignedStudentsQuery.isPending.value || assignedStudentsQuery.isFetching.value
    : studentsQuery.isPending.value || studentsQuery.isFetching.value,
)

const studentsErrorMessage = computed(() => {
  const error = isTeacher.value ? assignedStudentsQuery.error.value : studentsQuery.error.value

  return error ? getApiErrorMessage(error, t('api.serverCheck')) : undefined
})

const studentListTitle = computed(() => (isTeacher.value ? t('students.assignedTitle') : t('students.title')))

const columns = computed<TableColumn<StudentTableRow>[]>(() => [
  { accessorKey: 'displayName', header: t('common.name') },
  { accessorKey: 'email', header: t('common.email') },
  { accessorKey: 'level', header: t('students.level') },
  { accessorKey: 'className', header: t('students.class') },
  { accessorKey: 'activeLabel', header: t('common.status') },
  { accessorKey: 'createdAtLabel', header: t('common.registeredAt') },
  { id: 'actions', header: '' },
])

const students = computed<StudentTableRow[]>(() =>
  (isTeacher.value
    ? (assignedStudentsQuery.data.value?.data ?? []).map((student) => ({
        ...student,
        birthDate: null,
        isActive: true,
        createdAt: student.assignedAt,
        updatedAt: student.assignedAt,
      }))
    : (studentsData.value?.data ?? [])
  ).map((student) => ({
    ...student,
    activeLabel: student.isActive ? t('common.active') : t('common.inactive'),
    createdAtLabel: formatDate(student.createdAt),
  })),
)

const formLoading = computed(() => createStudent.isPending.value || updateStudent.isPending.value)

const formError = computed(() =>
  createStudent.error.value || updateStudent.error.value ? t('common.inputCheck') : undefined,
)

const deleteError = computed(() => (deleteStudent.error.value ? t('common.retry') : undefined))

const deleteLoading = computed(() => deleteStudent.isPending.value)

function openCreateModal() {
  editingStudent.value = null
  isFormOpen.value = true
}

function openEditModal(student: Student) {
  editingStudent.value = student
  isFormOpen.value = true
}

function closeFormModal() {
  isFormOpen.value = false
  editingStudent.value = null
  createStudent.reset()
  updateStudent.reset()
}

function openDeleteModal(student: Student) {
  deletingStudent.value = student
  deleteStudent.reset()
  isDeleteOpen.value = true
}

function closeDeleteModal() {
  isDeleteOpen.value = false
  deletingStudent.value = null
  deleteStudent.reset()
}

function handleStudentSubmit(values: StudentFormValues) {
  if (editingStudent.value) {
    updateStudent.mutate(
      {
        path: { studentId: editingStudent.value.id },
        body: values,
      },
      {
        onSuccess: async () => {
          closeFormModal()
          await studentsQuery.refetch()
          toast.add({ title: t('toast.updateSuccess', { resource: t('students.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )

    return
  }

  createStudent.mutate(
    { body: values },
    {
      onSuccess: async () => {
        closeFormModal()
        await studentsQuery.refetch()
        toast.add({ title: t('toast.createSuccess', { resource: t('students.title') }), color: 'success' })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}

function handleStudentDelete() {
  if (!deletingStudent.value) {
    return
  }

  deleteStudent.mutate(
    { path: { studentId: deletingStudent.value.id } },
    {
      onSuccess: async () => {
        closeDeleteModal()
        await studentsQuery.refetch()
        toast.add({ title: t('toast.deleteSuccess', { resource: t('students.title') }), color: 'success' })
      },
      onError: (error) => deleteErrorToast.show(error),
    },
  )
}
</script>

<template>
  <section class="mx-auto flex max-w-6xl flex-col gap-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ studentListTitle }}</h1>
      </div>
      <UButton v-if="isRepresentative" :label="t('students.add')" icon="i-lucide-plus" @click="openCreateModal" />
    </div>

    <section class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <UAlert
        v-if="studentsIsError"
        color="error"
        :title="t('api.studentFetchFailed')"
        :description="studentsErrorMessage"
      />

      <UTable :data="students" :columns="columns" :loading="studentsIsFetching" class="w-full bg-white">
        <template #displayName-cell="{ row }">
          <button class="font-medium text-sky-700 hover:underline" @click="router.push(`/students/${row.original.id}`)">
            {{ row.original.displayName }}
          </button>
        </template>
        <template #className-cell="{ row }">
          <span>{{ row.original.className ?? '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip :text="t('common.viewDetails')">
              <UButton
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                :aria-label="t('common.viewDetails')"
                @click="router.push(`/students/${row.original.id}`)"
              />
            </UTooltip>
            <UTooltip v-if="isRepresentative" :text="t('common.edit')">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                :aria-label="t('common.edit')"
                @click="openEditModal(row.original)"
              />
            </UTooltip>
            <UTooltip v-if="isRepresentative" :text="t('common.delete')">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                :aria-label="t('common.delete')"
                @click="openDeleteModal(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>

      <p v-if="!studentsIsFetching && !studentsIsError && students.length === 0" class="text-sm text-slate-500">
        {{ t('students.noData') }}
      </p>
    </section>

    <StudentFormModal
      :open="isFormOpen"
      :student="editingStudent"
      :loading="formLoading"
      :error-message="formError"
      @update:open="(open) => (open ? (isFormOpen = true) : closeFormModal())"
      @submit="handleStudentSubmit"
    />

    <StudentDeleteModal
      :open="isDeleteOpen"
      :student="deletingStudent"
      :loading="deleteLoading"
      :error-message="deleteError"
      @update:open="(open) => (open ? (isDeleteOpen = true) : closeDeleteModal())"
      @confirm="handleStudentDelete"
    />
  </section>
</template>
