<script setup lang="ts">
import { computed } from 'vue'

import type { PaymentRecord } from '../../api/generated/types/PaymentRecord'
import { formatDate } from '../../utils/formatters'

const props = defineProps<{
  record: PaymentRecord
}>()

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

const invoiceNumber = computed(() => `INV-${props.record.id.slice(0, 8).toUpperCase()}`)
</script>

<template>
  <article class="invoice-document mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-10 text-slate-900 shadow-sm">
    <header class="flex items-start justify-between border-b-2 border-slate-900 pb-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Invoice</p>
        <h1 class="mt-2 text-3xl font-bold tracking-wide">請求書</h1>
      </div>
      <dl class="text-right text-sm">
        <div class="flex justify-end gap-6">
          <dt class="text-slate-500">請求番号</dt>
          <dd class="font-semibold">{{ invoiceNumber }}</dd>
        </div>
        <div class="mt-2 flex justify-end gap-6">
          <dt class="text-slate-500">発行日</dt>
          <dd>{{ formatDate(record.purchasedAt) }}</dd>
        </div>
        <div v-if="record.dueDate" class="mt-2 flex justify-end gap-6">
          <dt class="text-slate-500">支払期限</dt>
          <dd>{{ formatDate(record.dueDate) }}</dd>
        </div>
      </dl>
    </header>

    <section class="mt-10 grid grid-cols-2 gap-8">
      <div>
        <p class="text-xs font-semibold tracking-wider text-slate-500">請求先</p>
        <p class="mt-3 text-xl font-semibold">{{ record.studentName }} 様</p>
      </div>
      <div class="text-right">
        <p class="text-xs font-semibold tracking-wider text-slate-500">発行者</p>
        <p class="mt-3 text-xl font-semibold">Disco Language School</p>
        <p class="mt-2 text-sm leading-6 text-slate-500">〒150-0001<br />東京都渋谷区神宮前1-2-3<br />03-1234-5678</p>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="border-b border-slate-300 pb-3 text-base font-semibold">請求項目</h2>
      <table class="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-300 text-left text-slate-500">
            <th class="py-3 font-medium">項目</th>
            <th class="w-24 py-3 text-right font-medium">数量</th>
            <th class="w-36 py-3 text-right font-medium">単価</th>
            <th class="w-36 py-3 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-100">
            <td class="py-4">{{ record.className ?? 'クラス' }}（5回分）</td>
            <td class="py-4 text-right">1</td>
            <td class="py-4 text-right">{{ formatCurrency(record.lessonAmountMinor) }}</td>
            <td class="py-4 text-right">{{ formatCurrency(record.lessonAmountMinor) }}</td>
          </tr>
          <tr v-for="textbook in record.textbooks" :key="textbook.id" class="border-b border-slate-100">
            <td class="py-4">教材費：{{ textbook.title }}</td>
            <td class="py-4 text-right">1</td>
            <td class="py-4 text-right">{{ formatCurrency(textbook.priceMinorSnapshot) }}</td>
            <td class="py-4 text-right">{{ formatCurrency(textbook.priceMinorSnapshot) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="mt-8 flex justify-end">
      <dl class="w-80 text-sm">
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">授業料</dt>
          <dd>{{ formatCurrency(record.lessonAmountMinor) }}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">教材費</dt>
          <dd>{{ formatCurrency(record.textbookAmountMinor) }}</dd>
        </div>
        <div class="mt-2 flex justify-between border-t-2 border-slate-900 py-4 text-lg font-bold">
          <dt>合計</dt>
          <dd>{{ formatCurrency(record.totalAmountMinor) }}</dd>
        </div>
      </dl>
    </section>

    <section class="mt-10 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
      <div>
        <h2 class="text-base font-semibold">お振込先</h2>
        <dl class="mt-3 space-y-1 text-sm leading-6 text-slate-600">
          <div class="flex gap-3">
            <dt class="w-20 text-slate-500">銀行名</dt>
            <dd>みずほ銀行</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 text-slate-500">支店名</dt>
            <dd>渋谷支店</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 text-slate-500">口座種別</dt>
            <dd>普通</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 text-slate-500">口座番号</dt>
            <dd>1234567</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 text-slate-500">口座名義</dt>
            <dd>ディスコランゲージスクール</dd>
          </div>
        </dl>
      </div>
      <div class="text-right text-sm leading-6 text-slate-500">
        <p>お振込手数料はご負担ください。</p>
        <p>ご不明点は発行者までお問い合わせください。</p>
      </div>
    </section>

    <footer class="mt-16 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500">
      <p>本請求書は支払い記録1件をもとに作成しています。</p>
      <p>{{ record.className ?? 'クラス' }} 5回分のチケット料金を含みます。</p>
    </footer>
  </article>
</template>
