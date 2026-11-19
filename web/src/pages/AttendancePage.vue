<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AttendanceRecord } from '../api/generated/types/AttendanceRecord'
import { useGetAttendanceRecords, useGetAuthDemoOptions, usePostAttendanceRecords } from '../api/generated/hooks'
import { useAuth } from '../composables/useAuth'
import { formatDate } from '../utils/formatters'
import AttendanceFormModal, { type AttendanceFormValues } from '../components/attendance/AttendanceFormModal.vue'

const { t, locale } = useI18n()

const { isTeacher } = useAuth()

const selectedUserId = ref('')

const usersQuery = useGetAuthDemoOptions()

const userOptions = computed(() =>
  (usersQuery.data.value?.data ?? []).map((user) => ({
    label: `${user.displayName}（${user.role}）`,
    value: user.userId,
  })),
)

watch(
  userOptions,
  (options) => {
    if (!isTeacher.value && !selectedUserId.value && options[0]) selectedUserId.value = options[0].value
  },
  { immediate: true },
)

const attendanceQuery = useGetAttendanceRecords({
  query: computed(() => (selectedUserId.value ? { userId: selectedUserId.value } : {})),
})

const createAttendance = usePostAttendanceRecords()

const toast = useToast()

const isFormOpen = ref(false)

const records = computed<AttendanceRecord[]>(() => attendanceQuery.data.value?.data ?? [])

const timeFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }))

const statusLabel = (status: AttendanceRecord['status']) => t(`attendance.statuses.${status}`)

const formatAttendanceDate = (date: string) => formatDate(date)

const formatTime = (value: string | null) => (value ? timeFormatter.value.format(new Date(value)) : '—')

function submitAttendance(values: AttendanceFormValues) {
  createAttendance.mutate(
    { body: values },
    {
      onSuccess: async () => {
        isFormOpen.value = false
        await attendanceQuery.refetch()
        toast.add({ title: t('attendance.createSuccess'), color: 'success' })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}
</script>

<template>
  <UContainer class="max-w-6xl">
    <div class="space-y-6">
      <UPageHeader
        :title="t('attendance.title')"
        :description="isTeacher ? t('attendance.teacherDescription') : t('attendance.managementDescription')"
      >
        <template #links>
          <UButton :label="t('attendance.add')" icon="i-lucide-plus" @click="isFormOpen = true" />
        </template>
      </UPageHeader>

      <UCard variant="outline">
        <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
          <UFormField v-if="!isTeacher" :label="t('attendance.userSelect')" class="w-full sm:w-72">
            <USelectMenu v-model="selectedUserId" :items="userOptions" value-key="value" class="w-full" />
          </UFormField>
          <UBadge
            :label="isTeacher ? t('attendance.myRecords') : t('attendance.selectedRecord')"
            color="primary"
            variant="subtle"
          />
        </div>

        <UAlert
          v-if="attendanceQuery.isError.value"
          color="error"
          :title="t('api.attendanceFetchFailed')"
          :description="t('api.serverCheck')"
          class="mb-4"
        />
        <UTable
          :data="records"
          :loading="attendanceQuery.isPending.value || attendanceQuery.isFetching.value"
          :columns="[
            { accessorKey: 'attendanceDate', header: t('attendance.date') },
            { accessorKey: 'userName', header: t('attendance.user') },
            { accessorKey: 'clockInAt', header: t('attendance.start') },
            { accessorKey: 'clockOutAt', header: t('attendance.end') },
            { accessorKey: 'status', header: t('common.status') },
            { accessorKey: 'note', header: t('attendance.note') },
          ]"
          class="w-full bg-white"
        >
          <template #attendanceDate-cell="{ row }">{{ formatAttendanceDate(row.original.attendanceDate) }}</template>
          <template #clockInAt-cell="{ row }">{{ formatTime(row.original.clockInAt) }}</template>
          <template #clockOutAt-cell="{ row }">{{ formatTime(row.original.clockOutAt) }}</template>
          <template #status-cell="{ row }"
            ><UBadge
              :label="statusLabel(row.original.status)"
              :color="
                row.original.status === 'present' ? 'success' : row.original.status === 'late' ? 'warning' : 'neutral'
              "
              variant="subtle"
          /></template>
        </UTable>
        <UEmpty
          v-if="
            !attendanceQuery.isPending.value &&
            !attendanceQuery.isFetching.value &&
            !attendanceQuery.isError.value &&
            records.length === 0
          "
          icon="i-lucide-calendar-clock"
          :title="t('attendance.noData')"
          size="sm"
        />
      </UCard>
      <AttendanceFormModal
        :open="isFormOpen"
        :loading="createAttendance.isPending.value"
        :error-message="createAttendance.error.value ? t('common.retry') : undefined"
        @update:open="isFormOpen = $event"
        @submit="submitAttendance"
      />
    </div>
  </UContainer>
</template>
