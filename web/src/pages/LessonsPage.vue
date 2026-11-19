<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'

import {
  useDeleteLessonsLessonid,
  useGetLessons,
  useGetClasses,
  useGetMeStudents,
  useGetStudents,
  useGetTeachers,
  usePatchLessonsLessonid,
  usePostLessons,
} from '../api/generated/hooks'
import type { Lesson } from '../api/generated/types/Lesson'
import LessonDeleteModal from '../components/lessons/LessonDeleteModal.vue'
import LessonCalendar from '../components/lessons/LessonCalendar.vue'
import LessonFormModal, { type LessonFormValues } from '../components/lessons/LessonFormModal.vue'
import { useAuth } from '../composables/useAuth'
import { getApiErrorMessage } from '../composables/useApiError'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { formatDate, formatTime } from '../utils/formatters'

const { t, locale } = useI18n()

const { currentUser, isTeacher, canManageSchedule, canViewLessonRecords, canViewStudents } = useAuth()

const searchQuery = ref('')

const filterStatus = ref<'all' | Lesson['status']>('all')

const filterTeacherId = ref('__all__')

const filterStudentId = ref('__all__')

const sortBy = ref<'scheduledStart' | 'title' | 'status'>('scheduledStart')

const sortOrder = ref<'asc' | 'desc'>('desc')

const page = ref(1)

const pageSize = 10

const viewMode = ref<'table' | 'calendar'>('table')

const lessonQueryParams = computed(() => ({
  q: searchQuery.value.trim() || undefined,
  status: filterStatus.value === 'all' ? undefined : filterStatus.value,
  teacherId: filterTeacherId.value === '__all__' ? undefined : filterTeacherId.value,
  studentId: filterStudentId.value === '__all__' ? undefined : filterStudentId.value,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
  page: viewMode.value === 'table' ? page.value : 1,
  pageSize: viewMode.value === 'table' ? pageSize : 100,
}))

const lessonsQuery = useGetLessons({ query: lessonQueryParams })

const teachersQuery = useGetTeachers({}, { query: { enabled: canManageSchedule } })

const classesQuery = useGetClasses({ query: { active: 'true', pageSize: 100 } })

const studentsQuery = useGetStudents({}, { query: { enabled: canViewStudents } })

const myStudentsQuery = useGetMeStudents({ query: { enabled: isTeacher } })

const {
  data: lessonsData,
  isError: lessonsIsError,
  isPending: lessonsIsPending,
  isFetching: lessonsIsFetching,
} = lessonsQuery

const lessonsIsLoading = computed(() => lessonsIsPending.value || lessonsIsFetching.value)

const lessonsErrorMessage = computed(() =>
  lessonsQuery.error.value ? getApiErrorMessage(lessonsQuery.error.value, t('api.serverCheck')) : undefined,
)

const createLesson = usePostLessons()

const updateLesson = usePatchLessonsLessonid()

const deleteLesson = useDeleteLessonsLessonid()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const router = useRouter()

const canViewRecords = canViewLessonRecords

const isFormOpen = ref(false)

const isDeleteOpen = ref(false)

const editingLesson = ref<Lesson | null>(null)

const deletingLesson = ref<Lesson | null>(null)

type LessonTableRow = Lesson & {
  teacherName: string
  studentName: string
  statusLabel: string
  recordLabel: string
  scheduledAtLabel: string
}
const statusLabels = computed<Record<Lesson['status'], string>>(() => ({
  scheduled: t('lessons.statuses.scheduled'),
  completed: t('lessons.statuses.completed'),
  absent: t('lessons.statuses.absent'),
  cancelled: t('lessons.statuses.cancelled'),
}))

const columns = computed<TableColumn<LessonTableRow>[]>(() => [
  { accessorKey: 'scheduledAtLabel', header: t('lessons.dateTime') },
  { accessorKey: 'title', header: t('lessons.name') },
  { accessorKey: 'teacherName', header: t('lessons.teacher') },
  { accessorKey: 'studentName', header: t('lessons.student') },
  { accessorKey: 'statusLabel', header: t('common.status') },
  ...(canViewRecords.value ? [{ accessorKey: 'recordLabel', header: t('lessons.record') }] : []),
  { id: 'actions', header: '' },
])

const teacherMap = computed(
  () => new Map((teachersQuery.data.value?.data ?? []).map((teacher) => [teacher.id, teacher.displayName])),
)

const studentMap = computed(
  () => new Map((studentsQuery.data.value?.data ?? []).map((student) => [student.id, student.displayName])),
)

const formTeachers = computed(() =>
  isTeacher.value && currentUser.value?.teacherId
    ? (teachersQuery.data.value?.data ?? []).filter((teacher) => teacher.id === currentUser.value?.teacherId)
    : (teachersQuery.data.value?.data ?? []),
)

const formStudents = computed(() =>
  isTeacher.value
    ? (studentsQuery.data.value?.data ?? []).filter((student) =>
        new Set((myStudentsQuery.data.value?.data ?? []).map((item) => item.id)).has(student.id),
      )
    : (studentsQuery.data.value?.data ?? []),
)

const lessons = computed<LessonTableRow[]>(() =>
  (lessonsData.value?.data ?? []).map((lesson) => ({
    ...lesson,
    teacherName:
      lesson.teacherIds
        .map((id) => teacherMap.value.get(id))
        .filter(Boolean)
        .join(', ') ||
      teacherMap.value.get(lesson.teacherId) ||
      '—',
    studentName:
      lesson.studentIds
        .map((id) => studentMap.value.get(id))
        .filter(Boolean)
        .join(', ') ||
      studentMap.value.get(lesson.studentId) ||
      '—',
    statusLabel: statusLabels.value[lesson.status],
    recordLabel: lesson.record ? t('lessons.recordRegistered') : t('lessons.recordUnregistered'),
    scheduledAtLabel: `${formatDate(lesson.scheduledStart)} ${formatTime(lesson.scheduledStart, locale.value)}`,
  })),
)

const formLoading = computed(() => createLesson.isPending.value || updateLesson.isPending.value)

const formError = computed(() =>
  createLesson.error.value || updateLesson.error.value ? t('common.inputCheck') : undefined,
)

const deleteLoading = computed(() => deleteLesson.isPending.value)

const deleteError = computed(() => (deleteLesson.error.value ? t('common.retry') : undefined))

const statusOptions = computed(() => [
  { label: t('lessons.allStatuses'), value: 'all' },
  ...(['scheduled', 'completed', 'absent', 'cancelled'] as const).map((status) => ({
    label: statusLabels.value[status],
    value: status,
  })),
])

const teacherOptions = computed(() => [
  { label: t('lessons.allTeachers'), value: '__all__' },
  ...(teachersQuery.data.value?.data ?? []).map((teacher) => ({ label: teacher.displayName, value: teacher.id })),
])
function studentOptionLabel(student: { displayName: string; className?: string | null; level?: string | null }) {
  const details = student.className

  return details ? `${student.displayName}（${details}）` : student.displayName
}
const studentOptions = computed(() => [
  { label: t('lessons.allStudents'), value: '__all__' },
  ...(studentsQuery.data.value?.data ?? []).map((student) => ({
    label: studentOptionLabel(student),
    value: student.id,
  })),
])

const lessonTotal = computed(() => lessonsData.value?.meta.total ?? 0)

watch([searchQuery, filterStatus, filterTeacherId, filterStudentId, sortBy, sortOrder], () => {
  page.value = 1
})

function toggleSort(field: 'scheduledStart' | 'title' | 'status') {
  if (sortBy.value !== field) {
    sortBy.value = field
    sortOrder.value = 'asc'

    return
  }
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function sortIcon(field: 'scheduledStart' | 'title' | 'status') {
  if (sortBy.value !== field) return 'i-lucide-arrow-up-down'

  return sortOrder.value === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'
}

function studentLinks(lesson: LessonTableRow) {
  const ids = lesson.studentIds.length > 0 ? lesson.studentIds : [lesson.studentId]

  return ids
    .map((id) => ({ id, name: studentMap.value.get(id) }))
    .filter((student): student is { id: string; name: string } => Boolean(student.name))
}

function openStudentDetail(studentId: string) {
  void router.push(`/students/${studentId}`)
}

function openCreateModal() {
  editingLesson.value = null
  createLesson.reset()
  isFormOpen.value = true
}
function openEditModal(lesson: Lesson) {
  editingLesson.value = lesson
  updateLesson.reset()
  isFormOpen.value = true
}
function closeFormModal() {
  isFormOpen.value = false
  editingLesson.value = null
  createLesson.reset()
  updateLesson.reset()
}
function openDeleteModal(lesson: Lesson) {
  deletingLesson.value = lesson
  deleteLesson.reset()
  isDeleteOpen.value = true
}
function closeDeleteModal() {
  isDeleteOpen.value = false
  deletingLesson.value = null
  deleteLesson.reset()
}

function handleLessonSubmit(values: LessonFormValues) {
  if (editingLesson.value) {
    updateLesson.mutate(
      { path: { lessonId: editingLesson.value.id }, body: values },
      {
        onSuccess: async () => {
          closeFormModal()
          await lessonsQuery.refetch()
          toast.add({ title: t('toast.updateSuccess', { resource: t('lessons.title') }), color: 'success' })
        },
        onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
      },
    )

    return
  }
  createLesson.mutate(
    { body: values },
    {
      onSuccess: async () => {
        closeFormModal()
        await lessonsQuery.refetch()
        toast.add({ title: t('toast.createSuccess', { resource: t('lessons.title') }), color: 'success' })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}

function handleLessonDelete() {
  if (!deletingLesson.value) return
  deleteLesson.mutate(
    { path: { lessonId: deletingLesson.value.id } },
    {
      onSuccess: async () => {
        closeDeleteModal()
        await lessonsQuery.refetch()
        toast.add({ title: t('toast.deleteSuccess', { resource: t('lessons.title') }), color: 'success' })
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
        <h1 class="text-2xl font-semibold text-slate-900">{{ t('lessons.title') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ t('lessons.description') }}</p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <div class="flex rounded-lg border border-slate-200 bg-white p-1">
          <UButton
            :label="t('lessons.table')"
            icon="i-lucide-list"
            :variant="viewMode === 'table' ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="viewMode = 'table'"
          />
          <UButton
            :label="t('lessons.calendar')"
            icon="i-lucide-calendar-days"
            :variant="viewMode !== 'table' ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="viewMode = 'calendar'"
          />
        </div>
        <UButton v-if="canManageSchedule" :label="t('lessons.add')" icon="i-lucide-plus" @click="openCreateModal" />
      </div>
    </div>
    <section
      class="flex min-h-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      :class="viewMode === 'table' ? 'h-[calc(100dvh-12rem)]' : 'min-h-[calc(100dvh-12rem)]'"
    >
      <UAlert
        v-if="lessonsIsError"
        color="error"
        :title="t('api.lessonFetchFailed')"
        :description="lessonsErrorMessage"
      />
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="t('lessons.searchPlaceholder')"
          class="w-full"
        />
        <USelectMenu
          v-model="filterStatus"
          :items="statusOptions"
          value-key="value"
          :placeholder="t('lessons.filterStatus')"
          class="w-full"
        />
        <USelectMenu
          v-model="filterTeacherId"
          :items="teacherOptions"
          value-key="value"
          :placeholder="t('lessons.filterTeacher')"
          class="w-full"
        />
        <USelectMenu
          v-model="filterStudentId"
          :items="studentOptions"
          value-key="value"
          :placeholder="t('lessons.filterStudent')"
          class="w-full"
        />
      </div>
      <div v-if="viewMode === 'table'" class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-100">
        <UTable :data="lessons" :columns="columns" :loading="lessonsIsLoading" class="w-full bg-white">
          <template #scheduledAtLabel-header>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :label="t('lessons.dateTime')"
              :icon="sortIcon('scheduledStart')"
              trailing
              @click="toggleSort('scheduledStart')"
            />
          </template>
          <template #title-header>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :label="t('lessons.name')"
              :icon="sortIcon('title')"
              trailing
              @click="toggleSort('title')"
            />
          </template>
          <template #statusLabel-header>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :label="t('common.status')"
              :icon="sortIcon('status')"
              trailing
              @click="toggleSort('status')"
            />
          </template>
          <template #studentName-cell="{ row }">
            <div v-if="studentLinks(row.original).length" class="flex flex-wrap items-center gap-x-1">
              <template v-for="(student, index) in studentLinks(row.original)" :key="student.id">
                <button
                  type="button"
                  class="cursor-pointer text-left text-sky-700 underline-offset-2 hover:underline"
                  @click="openStudentDetail(student.id)"
                >
                  {{ student.name }}
                </button>
                <span v-if="index < studentLinks(row.original).length - 1" class="text-slate-400">、</span>
              </template>
            </div>
            <span v-else>—</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UTooltip :text="t('lessonDetail.title')"
                ><UButton
                  icon="i-lucide-external-link"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('lessonDetail.title')"
                  @click="router.push(`/lessons/${row.original.id}`)"
              /></UTooltip>
              <UTooltip v-if="canManageSchedule" :text="t('common.edit')"
                ><UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('common.edit')"
                  @click="openEditModal(row.original)"
              /></UTooltip>
              <UTooltip v-if="canManageSchedule" :text="t('common.delete')"
                ><UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  :aria-label="t('common.delete')"
                  @click="openDeleteModal(row.original)"
              /></UTooltip>
            </div>
          </template>
        </UTable>
      </div>
      <div
        v-if="viewMode === 'table' && lessonTotal > 0"
        class="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white pt-4"
      >
        <p class="text-sm text-slate-500">
          {{ t('lessons.paginationSummary', { total: lessonTotal, page, pageSize }) }}
        </p>
        <UPagination
          v-model:page="page"
          :total="lessonTotal"
          :items-per-page="pageSize"
          :sibling-count="1"
          show-edges
          color="neutral"
          variant="outline"
          active-variant="soft"
          :disabled="lessonsIsLoading"
          :aria-label="t('lessons.paginationLabel')"
        />
      </div>
      <p v-if="!lessonsIsLoading && !lessonsIsError && lessons.length === 0" class="text-sm text-slate-500">
        {{ t('lessons.noData') }}
      </p>

      <LessonCalendar
        v-if="viewMode !== 'table'"
        :lessons="lessons"
        @select="(lesson) => router.push(`/lessons/${lesson.id}`)"
      />
    </section>
    <LessonFormModal
      :open="isFormOpen"
      :lesson="editingLesson"
      :teachers="formTeachers"
      :teacher-locked="isTeacher"
      :students="formStudents"
      :classes="classesQuery.data.value?.data ?? []"
      :loading="formLoading"
      :error-message="formError"
      @update:open="(open) => (open ? (isFormOpen = true) : closeFormModal())"
      @submit="handleLessonSubmit"
    />
    <LessonDeleteModal
      :open="isDeleteOpen"
      :lesson="deletingLesson"
      :loading="deleteLoading"
      :error-message="deleteError"
      @update:open="(open) => (open ? (isDeleteOpen = true) : closeDeleteModal())"
      @confirm="handleLessonDelete"
    />
  </section>
</template>
