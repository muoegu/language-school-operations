<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useGetPaymentRecordsPaymentrecordid } from '../api/generated/hooks'
import InvoiceDocument from '../components/billing/InvoiceDocument.vue'
import { getApiErrorMessage } from '../composables/useApiError'
import { useSmartBack } from '../composables/useSmartBack'

const route = useRoute()

const { goBack } = useSmartBack('/students')

const paymentRecordId = computed(() => String(route.params.paymentRecordId))

const paymentQuery = useGetPaymentRecordsPaymentrecordid({ path: { paymentRecordId: paymentRecordId.value } })

const record = computed(() => paymentQuery.data.value?.data)
function printInvoice() {
  window.print()
}

function closeInvoice() {
  goBack()
}

function errorMessage() {
  return getApiErrorMessage(paymentQuery.error.value, '請求書データの取得に失敗しました。')
}

watch(record, (value) => {
  if (value) window.setTimeout(printInvoice, 250)
})

onMounted(() => {
  document.title = record.value ? `請求書 - ${record.value.studentName}` : '請求書'
})
</script>

<template>
  <div class="invoice-print-page min-h-screen bg-slate-100 p-4 sm:p-8">
    <div
      class="print-toolbar fixed bottom-4 left-4 z-10 flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
    >
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" label="閉じる" @click="closeInvoice" />
      <UButton icon="i-lucide-printer" label="印刷 / PDF保存" @click="printInvoice" />
    </div>

    <div
      v-if="paymentQuery.isLoading.value"
      class="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center text-slate-500"
    >
      請求書データを読み込んでいます。
    </div>
    <UAlert
      v-else-if="paymentQuery.isError.value"
      class="mx-auto max-w-3xl"
      color="error"
      title="請求書を表示できません"
      :description="errorMessage()"
    />
    <InvoiceDocument v-else-if="record" :record="record" />
  </div>
</template>

<style>
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html,
  body,
  #app {
    background: #fff !important;
  }

  .invoice-print-page {
    min-height: auto !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .print-toolbar {
    display: none !important;
  }

  .invoice-document {
    box-shadow: none !important;
    width: 210mm !important;
    max-width: none !important;
    min-height: 297mm !important;
    padding: 18mm !important;
  }
}
</style>
