<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import type { PaymentRecord } from '../api/generated/types/PaymentRecord'
import { useGetReportsPaymentRecords } from '../api/generated/hooks'
import { useAuth } from '../composables/useAuth'
import { getApiErrorMessage } from '../composables/useApiError'
import { formatCurrency as formatCurrencyValue, formatDate } from '../utils/formatters'

const { t, locale } = useI18n()

const { canViewPaymentData } = useAuth()

const reportQuery = useGetReportsPaymentRecords(
  { query: { page: 1, pageSize: 100 } },
  { query: { enabled: canViewPaymentData } },
)

const reportIsLoading = computed(() => reportQuery.isPending.value || reportQuery.isFetching.value)

const reportErrorMessage = computed(() =>
  reportQuery.error.value ? getApiErrorMessage(reportQuery.error.value, t('api.serverCheck')) : undefined,
)

const report = computed(() => reportQuery.data.value?.data)

const records = computed(() => report.value?.records ?? [])

const summary = computed(() => report.value?.summary)

const monthly = computed(() => report.value?.monthly ?? [])

const classes = computed(() => report.value?.byClass ?? [])

const maxMonthlyAmount = computed(() => Math.max(...monthly.value.map((item) => item.totalAmountMinor), 1))

const maxClassAmount = computed(() => Math.max(...classes.value.map((item) => item.totalAmountMinor), 1))

const columns = computed<TableColumn<PaymentRecord>[]>(() => [
  { accessorKey: 'purchasedAt', header: t('paymentReports.purchasedAt') },
  { accessorKey: 'studentName', header: t('paymentReports.student') },
  { accessorKey: 'className', header: t('paymentReports.class') },
  { accessorKey: 'lessonAmountMinor', header: t('studentDetail.lessonAmount') },
  { accessorKey: 'textbookAmountMinor', header: t('studentDetail.otherAmount') },
  { accessorKey: 'totalAmountMinor', header: t('studentDetail.amount') },
  { accessorKey: 'paymentStatus', header: t('studentDetail.paymentStatus') },
])

function formatCurrency(value: number) {
  return formatCurrencyValue(value, locale.value)
}
function statusLabel(status: PaymentRecord['paymentStatus']) {
  return t(`studentDetail.statuses.${status}`)
}
function paymentStatusColor(status: PaymentRecord['paymentStatus']) {
  if (status === 'paid') return 'success'
  if (status === 'unpaid') return 'warning'

  return 'neutral'
}
function monthlyWidth(value: number) {
  return `${Math.max((value / maxMonthlyAmount.value) * 100, 3)}%`
}
function classWidth(value: number) {
  return `${Math.max((value / maxClassAmount.value) * 100, 3)}%`
}
</script>

<template>
  <section class="mx-auto flex max-w-7xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">{{ t('paymentReports.title') }}</h1>
      <p class="mt-2 text-sm text-slate-500">{{ t('paymentReports.description') }}</p>
    </div>

    <UAlert
      v-if="reportQuery.isError.value"
      color="error"
      :title="t('paymentReports.fetchFailed')"
      :description="reportErrorMessage"
    />

    <div v-if="reportIsLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      <section v-for="index in 4" :key="index" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <USkeleton class="h-4 w-24" />
        <USkeleton class="mt-3 h-8 w-32" />
      </section>
    </div>
    <div v-else-if="summary" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ t('paymentReports.totalAmount') }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ formatCurrency(summary.totalAmountMinor) }}</p>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ t('paymentReports.recordCount') }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ summary.recordCount }}件</p>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ t('paymentReports.paidCount') }}</p>
        <p class="mt-2 text-2xl font-semibold text-emerald-600">{{ summary.paidCount }}件</p>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ t('paymentReports.unpaidCount') }}</p>
        <p class="mt-2 text-2xl font-semibold text-amber-600">{{ summary.unpaidCount }}件</p>
      </section>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">{{ t('paymentReports.monthlyTitle') }}</h2>
        <div v-if="reportIsLoading" class="mt-5 flex flex-col gap-4" aria-busy="true">
          <div v-for="index in 5" :key="index" class="grid grid-cols-[5rem_minmax(0,1fr)_7rem] items-center gap-3">
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-7 w-full" />
            <USkeleton class="ml-auto h-4 w-20" />
          </div>
        </div>
        <div v-else-if="monthly.length" class="mt-5 flex flex-col gap-4">
          <div
            v-for="item in monthly"
            :key="item.month"
            class="grid grid-cols-[5rem_minmax(0,1fr)_7rem] items-center gap-3 text-sm"
          >
            <span class="text-slate-500">{{ item.month }}</span>
            <div class="h-7 rounded bg-slate-100">
              <div class="h-7 rounded bg-sky-500" :style="{ width: monthlyWidth(item.totalAmountMinor) }" />
            </div>
            <span class="text-right font-medium text-slate-700">{{ formatCurrency(item.totalAmountMinor) }}</span>
          </div>
        </div>
        <p v-else class="mt-5 text-sm text-slate-500">{{ t('paymentReports.noData') }}</p>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">{{ t('paymentReports.classTitle') }}</h2>
        <div v-if="reportIsLoading" class="mt-5 flex flex-col gap-4" aria-busy="true">
          <div
            v-for="index in 5"
            :key="index"
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] items-center gap-3"
          >
            <USkeleton class="h-4 w-28" />
            <USkeleton class="h-7 w-full" />
            <USkeleton class="ml-auto h-4 w-20" />
          </div>
        </div>
        <div v-else-if="classes.length" class="mt-5 flex flex-col gap-4">
          <div
            v-for="item in classes"
            :key="item.classId ?? item.className"
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] items-center gap-3 text-sm"
          >
            <span class="truncate text-slate-700">{{ item.className }}</span>
            <div class="h-7 rounded bg-slate-100">
              <div class="h-7 rounded bg-indigo-500" :style="{ width: classWidth(item.totalAmountMinor) }" />
            </div>
            <span class="text-right font-medium text-slate-700">{{ formatCurrency(item.totalAmountMinor) }}</span>
          </div>
        </div>
        <p v-else class="mt-5 text-sm text-slate-500">{{ t('paymentReports.noData') }}</p>
      </section>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">{{ t('paymentReports.tableTitle') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('paymentReports.tableDescription') }}</p>
        </div>
        <UBadge :label="`${records.length}件`" color="primary" variant="subtle" />
      </div>
      <div v-if="reportIsLoading" class="overflow-hidden rounded-lg border border-slate-100" aria-busy="true">
        <div class="grid grid-cols-7 gap-4 border-b border-slate-200 px-4 py-3">
          <USkeleton v-for="index in 7" :key="index" class="h-4 w-full" />
        </div>
        <div
          v-for="row in 5"
          :key="row"
          class="grid grid-cols-7 gap-4 border-b border-slate-100 px-4 py-4 last:border-0"
        >
          <USkeleton v-for="column in 7" :key="column" class="h-4 w-full" />
        </div>
      </div>
      <UTable v-else :data="records" :columns="columns" class="w-full bg-white">
        <template #purchasedAt-cell="{ row }">{{ formatDate(row.original.purchasedAt) }}</template>
        <template #lessonAmountMinor-cell="{ row }">{{ formatCurrency(row.original.lessonAmountMinor) }}</template>
        <template #textbookAmountMinor-cell="{ row }">{{ formatCurrency(row.original.textbookAmountMinor) }}</template>
        <template #totalAmountMinor-cell="{ row }">{{ formatCurrency(row.original.totalAmountMinor) }}</template>
        <template #paymentStatus-cell="{ row }"
          ><UBadge
            :label="statusLabel(row.original.paymentStatus)"
            :color="paymentStatusColor(row.original.paymentStatus)"
            variant="subtle"
        /></template>
      </UTable>
      <p v-if="!reportIsLoading && !records.length" class="mt-4 text-sm text-slate-500">
        {{ t('paymentReports.noData') }}
      </p>
    </section>
  </section>
</template>
