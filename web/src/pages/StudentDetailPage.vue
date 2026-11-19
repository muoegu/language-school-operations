<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import {
  useGetLessons,
  useGetClasses,
  useGetPaymentRecords,
  useGetStudentsStudentid,
  useGetTextbooks,
  usePatchPaymentRecordsPaymentrecordid,
  usePostPaymentRecords,
} from '../api/generated/hooks'
import type { PaymentRecord } from '../api/generated/types/PaymentRecord'
import PaymentRecordFormModal, { type PaymentRecordFormValues } from '../components/billing/PaymentRecordFormModal.vue'
import { useAuth } from '../composables/useAuth'
import { useSmartBack } from '../composables/useSmartBack'
import { formatCurrency, formatDate } from '../utils/formatters'
import { formatJapaneseDuration } from '../utils/durations'

const route = useRoute()

const router = useRouter()

const { goBack } = useSmartBack('/students')

const { t, locale } = useI18n()

const toast = useToast()

const { canViewPaymentData } = useAuth()

const studentId = computed(() => String(route.params.studentId))

const studentQuery = useGetStudentsStudentid({ path: { studentId: studentId.value } })

const paymentQuery = useGetPaymentRecords(
  { query: { studentId: studentId.value, pageSize: 100 } },
  { query: { enabled: canViewPaymentData } },
)

const classesQuery = useGetClasses(
  { query: { active: 'true', pageSize: 100 } },
  { query: { enabled: canViewPaymentData } },
)

const textbooksQuery = useGetTextbooks(
  { query: { status: 'selling', pageSize: 100 } },
  { query: { enabled: canViewPaymentData } },
)

const lessonsQuery = useGetLessons({ query: { studentId: studentId.value, pageSize: 100 } })

const detailIsLoading = computed(
  () =>
    studentQuery.isPending.value ||
    studentQuery.isFetching.value ||
    (canViewPaymentData.value && (paymentQuery.isPending.value || paymentQuery.isFetching.value)),
)

const createPayment = usePostPaymentRecords()

const updatePayment = usePatchPaymentRecordsPaymentrecordid()

const isPurchaseOpen = ref(false)

const isEditPaymentOpen = ref(false)

const editingPayment = ref<PaymentRecord | null>(null)

const form = reactive({ classId: '', textbookIds: [] as string[] })

const student = computed(() => studentQuery.data.value?.data)

const paymentRecords = computed(() => paymentQuery.data.value?.data ?? [])

const classes = computed(() => classesQuery.data.value?.data ?? [])

const textbooks = computed(() => textbooksQuery.data.value?.data ?? [])

const lessons = computed(() => lessonsQuery.data.value?.data ?? [])

const lessonMap = computed(() => new Map(lessons.value.map((lesson) => [lesson.id, lesson])))

const remainingLessons = computed(() =>
  paymentRecords.value
    .filter((record) => record.paymentStatus === 'paid' && record.status === 'active')
    .reduce((total, record) => total + record.remainingLessons, 0),
)

const enrollmentHistory = computed(() => {
  if (!student.value?.createdAt) return '—'

  return formatJapaneseDuration(new Date(student.value.createdAt))
})

const currencyFormatter = computed(() => ({ format: (value: number) => formatCurrency(value, locale.value) }))

const selectedClass = computed(() => classes.value.find((item) => item.id === form.classId))

const purchaseAmount = computed(
  () =>
    (selectedClass.value?.priceMinor ?? 0) * 5 +
    form.textbookIds.reduce((sum, id) => sum + (textbooks.value.find((book) => book.id === id)?.priceMinor ?? 0), 0),
)

const purchaseLoading = computed(() => createPayment.isPending.value)

function openPurchase() {
  form.classId = classes.value[0]?.id ?? ''
  form.textbookIds = []
  createPayment.reset()
  isPurchaseOpen.value = true
}

function submitPurchase() {
  if (!form.classId) return
  createPayment.mutate(
    {
      body: {
        studentId: studentId.value,
        classId: form.classId,
        purchasedAt: new Date().toISOString(),
        textbookIds: form.textbookIds,
        lessonIds: [],
        paymentStatus: 'paid',
      },
    },
    {
      onSuccess: async () => {
        isPurchaseOpen.value = false
        await paymentQuery.refetch()
        toast.add({
          title: t('toast.createSuccess', { resource: t('studentDetail.paymentRecords') }),
          color: 'success',
        })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}

function statusLabel(status: string) {
  return t(`studentDetail.statuses.${status}`)
}

function paymentStatusColor(status: PaymentRecord['paymentStatus']) {
  if (status === 'paid') return 'success'
  if (status === 'unpaid') return 'warning'

  return 'neutral'
}

function textbookTooltip(record: PaymentRecord) {
  return record.textbooks
    .map((textbook) => `${textbook.title}：${currencyFormatter.value.format(textbook.priceMinorSnapshot)}`)
    .join('\n')
}

function lessonStampDate(lessonId: string) {
  const lesson = lessonMap.value.get(lessonId)

  return lesson ? formatDate(lesson.scheduledStart) : null
}

function openInvoice(paymentRecordId: string) {
  void router.push(`/print/payment-record/${paymentRecordId}`)
}

function openPaymentEdit(record: PaymentRecord) {
  editingPayment.value = record
  updatePayment.reset()
  isEditPaymentOpen.value = true
}

function submitPaymentEdit(values: PaymentRecordFormValues) {
  if (!editingPayment.value) return
  updatePayment.mutate(
    { path: { paymentRecordId: editingPayment.value.id }, body: values },
    {
      onSuccess: async () => {
        isEditPaymentOpen.value = false
        editingPayment.value = null
        await paymentQuery.refetch()
        toast.add({
          title: t('toast.updateSuccess', { resource: t('studentDetail.paymentRecords') }),
          color: 'success',
        })
      },
      onError: () => toast.add({ title: t('toast.operationFailed'), color: 'error' }),
    },
  )
}
</script>

<template>
  <section class="mx-auto flex max-w-6xl flex-col gap-6">
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
        <p class="text-sm text-slate-500">{{ t('studentDetail.breadcrumb') }}</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ student?.displayName ?? t('studentDetail.title') }}</h1>
      </div>
    </div>

    <UAlert
      v-if="studentQuery.isError.value || (canViewPaymentData && paymentQuery.isError.value)"
      color="error"
      :title="t('api.studentFetchFailed')"
      :description="t('api.serverCheck')"
    />

    <div v-else-if="detailIsLoading" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]" aria-busy="true">
      <div class="flex flex-col gap-6">
        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <USkeleton class="h-5 w-32" />
              <USkeleton class="mt-3 h-4 w-48" />
            </div>
            <USkeleton class="h-7 w-14 rounded-full" />
          </div>
          <div class="mt-6 grid gap-5 sm:grid-cols-4">
            <div v-for="item in 4" :key="item"><USkeleton class="h-4 w-20" /><USkeleton class="mt-2 h-5 w-24" /></div>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div class="flex-1"><USkeleton class="h-5 w-32" /><USkeleton class="mt-3 h-4 w-64" /></div>
            <USkeleton class="h-10 w-32 rounded-lg" />
          </div>
          <div class="overflow-hidden rounded-lg border border-slate-100">
            <div class="grid grid-cols-8 gap-3 border-b border-slate-200 px-4 py-3">
              <USkeleton v-for="column in 8" :key="column" class="h-4 w-full" />
            </div>
            <div
              v-for="row in 3"
              :key="row"
              class="grid grid-cols-8 gap-3 border-b border-slate-100 px-4 py-4 last:border-0"
            >
              <USkeleton v-for="column in 8" :key="column" class="h-4 w-full" />
            </div>
          </div>
        </section>
      </div>
      <aside class="flex flex-col gap-4">
        <section class="rounded-xl border border-sky-100 bg-sky-50 p-6">
          <USkeleton class="h-4 w-24" /><USkeleton class="mt-4 h-10 w-20" /><USkeleton class="mt-4 h-4 w-full" />
        </section>
      </aside>
    </div>
    <div
      v-else-if="!studentQuery.isError.value && !(canViewPaymentData && paymentQuery.isError.value)"
      class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div class="flex flex-col gap-6">
        <section v-if="canViewPaymentData" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ t('studentDetail.profile') }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ student?.email }}</p>
            </div>
            <UBadge
              :label="student?.isActive ? t('common.active') : t('common.inactive')"
              color="primary"
              variant="subtle"
            />
          </div>
          <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-slate-500">{{ t('students.level') }}</dt>
              <dd class="mt-1 font-medium">{{ student?.level ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">{{ t('students.class') }}</dt>
              <dd class="mt-1 font-medium">{{ student?.className ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">{{ t('studentDetail.enrollmentHistory') }}</dt>
              <dd class="mt-1 font-medium">{{ enrollmentHistory }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">{{ t('common.registeredAt') }}</dt>
              <dd class="mt-1 font-medium">{{ student?.createdAt ? formatDate(student.createdAt) : '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ t('studentDetail.paymentRecords') }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ t('studentDetail.paymentRecordsDescription') }}</p>
            </div>
            <UButton
              v-if="canViewPaymentData"
              icon="i-lucide-plus"
              :label="t('studentDetail.purchaseTicket')"
              :disabled="classes.length === 0"
              @click="openPurchase"
            />
          </div>
          <UTable
            :data="paymentRecords"
            :columns="[
              { accessorKey: 'purchasedAt', header: t('studentDetail.purchasedAt') },
              { accessorKey: 'className', header: t('students.class') },
              { accessorKey: 'remainingLessons', header: t('studentDetail.remainingLessons') },
              { accessorKey: 'lessonAmountMinor', header: t('studentDetail.lessonAmount') },
              { accessorKey: 'textbookAmountMinor', header: t('studentDetail.otherAmount') },
              { accessorKey: 'totalAmountMinor', header: t('studentDetail.amount') },
              { accessorKey: 'paymentStatus', header: t('studentDetail.paymentStatus') },
              { accessorKey: 'status', header: t('studentDetail.ticketStatus') },
              { id: 'actions', header: '' },
            ]"
            :loading="paymentQuery.isPending.value || paymentQuery.isFetching.value"
          >
            <template #purchasedAt-cell="{ row }">{{ formatDate(row.original.purchasedAt) }}</template>
            <template #className-cell="{ row }">{{ row.original.className ?? '—' }}</template>
            <template #remainingLessons-cell="{ row }"
              >{{ row.original.remainingLessons }} / {{ row.original.lessonCount }}</template
            >
            <template #lessonAmountMinor-cell="{ row }">{{
              currencyFormatter.format(row.original.lessonAmountMinor)
            }}</template>
            <template #textbookAmountMinor-cell="{ row }">
              <UTooltip v-if="row.original.textbooks.length" :text="textbookTooltip(row.original)">
                <span class="cursor-help border-b border-dashed border-slate-400">{{
                  currencyFormatter.format(row.original.textbookAmountMinor)
                }}</span>
              </UTooltip>
              <span v-else>{{ currencyFormatter.format(row.original.textbookAmountMinor) }}</span>
            </template>
            <template #totalAmountMinor-cell="{ row }">{{
              currencyFormatter.format(row.original.totalAmountMinor)
            }}</template>
            <template #paymentStatus-cell="{ row }"
              ><UBadge
                :label="statusLabel(row.original.paymentStatus)"
                :color="paymentStatusColor(row.original.paymentStatus)"
                variant="subtle"
            /></template>
            <template #status-cell="{ row }"
              ><UBadge :label="statusLabel(row.original.status)" color="neutral" variant="subtle"
            /></template>
            <template #actions-cell="{ row }"
              ><div class="flex justify-end gap-1">
                <UTooltip v-if="canViewPaymentData" :text="t('common.edit')"
                  ><UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="t('common.edit')"
                    @click="openPaymentEdit(row.original)" /></UTooltip
                ><UTooltip v-if="canViewPaymentData" :text="t('studentDetail.printInvoice')"
                  ><UButton
                    icon="i-lucide-printer"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="t('studentDetail.printInvoice')"
                    @click="openInvoice(row.original.id)"
                /></UTooltip></div
            ></template>
          </UTable>
          <p
            v-if="
              canViewPaymentData &&
              !paymentQuery.isPending.value &&
              !paymentQuery.isFetching.value &&
              paymentRecords.length === 0
            "
            class="mt-4 text-sm text-slate-500"
          >
            {{ t('studentDetail.noPaymentRecords') }}
          </p>
        </section>
      </div>

      <aside class="flex flex-col gap-4">
        <section v-if="canViewPaymentData" class="rounded-xl border border-sky-100 bg-sky-50 p-6 shadow-sm">
          <p class="text-sm font-medium text-sky-700">{{ t('studentDetail.ticketBalance') }}</p>
          <p class="mt-3 text-4xl font-semibold text-slate-900">
            {{ remainingLessons
            }}<span class="ml-1 text-base font-normal text-slate-500">{{ t('studentDetail.lessonUnit') }}</span>
          </p>
          <p class="mt-3 text-sm leading-6 text-slate-600">{{ t('studentDetail.ticketRule', { count: 5 }) }}</p>
        </section>

        <template v-if="canViewPaymentData">
          <section
            v-for="record in paymentRecords"
            :key="record.id"
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-slate-900">{{ t('studentDetail.lessonStamps') }}</h2>
                <p class="mt-1 text-xs text-slate-500">{{ formatDate(record.purchasedAt) }}</p>
              </div>
              <UBadge :label="statusLabel(record.status)" color="neutral" variant="subtle" />
            </div>
            <div class="mt-4 flex flex-col gap-2">
              <div
                v-for="index in 5"
                :key="`${record.id}-${index}`"
                class="flex items-center gap-3 rounded-lg border border-slate-100 px-2 py-2"
              >
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                  :class="
                    record.lessonIds[index - 1]
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-dashed border-slate-300 text-slate-400'
                  "
                >
                  <UIcon v-if="record.lessonIds[index - 1]" name="i-lucide-check" class="size-4" />
                  <span v-else>{{ index }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-slate-600">
                    {{ t('studentDetail.lessonNumber', { number: index }) }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{
                      record.lessonIds[index - 1]
                        ? lessonStampDate(record.lessonIds[index - 1])
                        : t('studentDetail.notCompleted')
                    }}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </template>
      </aside>
    </div>

    <UModal v-model:open="isPurchaseOpen" :title="t('studentDetail.purchaseTitle')">
      <template #body>
        <form class="flex flex-col gap-5" @submit.prevent="submitPurchase">
          <UFormField :label="t('studentDetail.lessonType')" required>
            <USelectMenu
              v-model="form.classId"
              :items="
                classes.map((item) => ({
                  label: `${item.name} / ${currencyFormatter.format(item.priceMinor)}`,
                  value: item.id,
                }))
              "
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('studentDetail.textbooks')">
            <USelectMenu
              v-model="form.textbookIds"
              multiple
              :items="
                textbooks.map((book) => ({
                  label: `${book.title} / ${currencyFormatter.format(book.priceMinor)}`,
                  value: book.id,
                }))
              "
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <div class="rounded-lg bg-slate-50 p-4 text-sm">
            <span class="text-slate-500">{{ t('studentDetail.total') }}</span><strong class="ml-3 text-lg">{{
              currencyFormatter.format(purchaseAmount)
            }}</strong>
          </div>
          <UAlert
            v-if="createPayment.isError.value"
            color="error"
            :title="t('common.saveFailed')"
            :description="t('common.retry')"
          />
          <div class="flex justify-end gap-3">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :label="t('common.cancel')"
              :disabled="purchaseLoading"
              @click="isPurchaseOpen = false"
            /><UButton
              type="submit"
              :label="t('studentDetail.purchase')"
              :loading="purchaseLoading"
              :disabled="purchaseLoading || !form.classId"
            />
          </div>
        </form>
      </template>
    </UModal>
    <PaymentRecordFormModal
      :open="isEditPaymentOpen"
      :record="editingPayment"
      :classes="classes"
      :textbooks="textbooks"
      :loading="updatePayment.isPending.value"
      :error-message="updatePayment.error.value ? t('common.retry') : undefined"
      @update:open="isEditPaymentOpen = $event"
      @submit="submitPaymentEdit"
    />
  </section>
</template>
