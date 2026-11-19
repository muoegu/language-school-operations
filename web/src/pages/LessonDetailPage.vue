<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import {
  useDeleteLessonsLessonidRecord,
  useGetLessonsLessonid,
  useGetLessonsLessonidRecord,
  useGetStudents,
  useGetTeachers,
  usePatchLessonsLessonidRecord,
  usePostLessonsLessonidRecord,
} from '../api/generated/hooks'
import LessonRecordForm, { type LessonRecordFormValues } from '../components/lessons/LessonRecordForm.vue'
import { useAuth } from '../composables/useAuth'
import { getApiErrorCode, getApiErrorMessage } from '../composables/useApiError'
import { useDeleteErrorToast } from '../composables/useDeleteErrorToast'
import { useSmartBack } from '../composables/useSmartBack'
import { formatDateTimeYmd } from '../utils/formatters'

const route = useRoute()

const { goBack } = useSmartBack('/lessons')

const { t, locale } = useI18n()

const toast = useToast()

const deleteErrorToast = useDeleteErrorToast()

const lessonId = computed(() => String(route.params.lessonId))

const { canManageSchedule, canViewLessonRecords, canViewStudents } = useAuth()

const canViewRecords = canViewLessonRecords

const lessonQuery = useGetLessonsLessonid({ path: { lessonId: lessonId.value } })

const recordQuery = useGetLessonsLessonidRecord(
  { path: { lessonId: lessonId.value } },
  { query: { enabled: canViewRecords.value } },
)

const teachersQuery = useGetTeachers({}, { query: { enabled: canManageSchedule } })

const studentsQuery = useGetStudents({}, { query: { enabled: canViewStudents } })

const createRecord = usePostLessonsLessonidRecord()

const updateRecord = usePatchLessonsLessonidRecord()

const deleteRecord = useDeleteLessonsLessonidRecord()

const lesson = computed(() => lessonQuery.data.value?.data)

const record = computed(() =>
  canViewRecords.value ? (recordQuery.data.value?.data ?? lesson.value?.record ?? null) : null,
)

const teacherNames = computed(
  () =>
    (lesson.value?.teacherIds ?? [])
      .map((id) => teachersQuery.data.value?.data.find((teacher) => teacher.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || '—',
)

const studentNames = computed(
  () =>
    (lesson.value?.studentIds ?? [])
      .map((id) => studentsQuery.data.value?.data.find((student) => student.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || '—',
)

const recordLoading = computed(
  () => createRecord.isPending.value || updateRecord.isPending.value || deleteRecord.isPending.value,
)

const recordError = computed(() =>
  createRecord.error.value || updateRecord.error.value || deleteRecord.error.value ? t('common.retry') : undefined,
)

const lessonErrorMessage = computed(() =>
  lessonQuery.error.value ? getApiErrorMessage(lessonQuery.error.value, t('api.serverCheck')) : undefined,
)

function formatDate(value: string | undefined) {
  return formatDateTimeYmd(value, locale.value)
}

function saveRecord(values: LessonRecordFormValues) {
  const options = { path: { lessonId: lessonId.value }, body: values }

  const mutation = record.value ? updateRecord : createRecord
  mutation.mutate(options, {
    onSuccess: async () => {
      await Promise.all([lessonQuery.refetch(), recordQuery.refetch()])
      toast.add({
        title: t(record.value ? 'toast.updateSuccess' : 'toast.createSuccess', { resource: t('lessonRecord.title') }),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t(
          getApiErrorCode(error) === 'PAYMENT_REQUIRED' ? 'lessonRecord.paymentRequired' : 'toast.operationFailed',
        ),
        color: 'error',
      })
    },
  })
}

function removeRecord() {
  deleteRecord.mutate(
    { path: { lessonId: lessonId.value } },
    {
      onSuccess: async () => {
        await Promise.all([lessonQuery.refetch(), recordQuery.refetch()])
        toast.add({ title: t('toast.deleteSuccess', { resource: t('lessonRecord.title') }), color: 'success' })
      },
      onError: (error) => deleteErrorToast.show(error),
    },
  )
}
</script>

<template>
  <section class="mx-auto flex max-w-5xl flex-col gap-6">
    <div class="flex items-center gap-3">
      <UTooltip :text="t('common.back')"
        ><UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          :aria-label="t('common.back')"
          @click="goBack"
      /></UTooltip>
      <div>
        <p class="text-sm text-slate-500">{{ t('lessonDetail.breadcrumb') }}</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ lesson?.title ?? t('lessonDetail.title') }}</h1>
      </div>
    </div>

    <UAlert
      v-if="lessonQuery.isError.value"
      color="error"
      :title="t('api.lessonFetchFailed')"
      :description="lessonErrorMessage"
    />
    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">{{ t('lessonDetail.lessonInfo') }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ t('lessonDetail.lessonInfoDescription') }}</p>
          </div>
          <UBadge :label="lesson?.status" color="primary" variant="subtle" />
        </div>
        <dl class="divide-y divide-slate-100 text-sm">
          <div class="flex justify-between gap-4 py-3">
            <dt class="text-slate-500">{{ t('lessons.dateTime') }}</dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(lesson?.scheduledStart) }}<br />〜 {{ formatDate(lesson?.scheduledEnd) }}
            </dd>
          </div>
          <div class="flex justify-between gap-4 py-3">
            <dt class="text-slate-500">{{ t('lessons.teacher') }}</dt>
            <dd class="text-right text-slate-800">{{ teacherNames }}</dd>
          </div>
          <div class="flex justify-between gap-4 py-3">
            <dt class="text-slate-500">{{ t('lessons.student') }}</dt>
            <dd class="text-right text-slate-800">{{ studentNames }}</dd>
          </div>
          <div class="flex justify-between gap-4 py-3">
            <dt class="text-slate-500">{{ t('students.level') }}</dt>
            <dd class="text-right text-slate-800">{{ lesson?.level ?? '—' }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="canViewRecords" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-slate-900">{{ t('lessonRecord.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('lessonRecord.description') }}</p>
        </div>
        <LessonRecordForm
          :record="record"
          :initial-outcome="lesson?.status === 'absent' || lesson?.status === 'cancelled' ? lesson.status : 'completed'"
          :loading="recordLoading"
          :error-message="recordError"
          :can-remove="lesson?.status !== 'completed'"
          @submit="saveRecord"
          @remove="removeRecord"
        />
      </section>
      <section v-else class="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-amber-900">{{ t('lessonRecord.restrictedTitle') }}</h2>
        <p class="mt-2 text-sm text-amber-800">{{ t('lessonRecord.restrictedDescription') }}</p>
      </section>
    </div>
  </section>
</template>
