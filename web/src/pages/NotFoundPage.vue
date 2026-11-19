<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSmartBack } from '../composables/useSmartBack'

const { goBack } = useSmartBack('/')

const { t } = useI18n()
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">404</p>
      <h1 class="mt-3 text-2xl font-semibold text-slate-900">{{ t('notFound.title') }}</h1>
      <p class="mt-3 text-sm leading-6 text-slate-500">{{ t('notFound.description') }}</p>
      <UButton class="mt-8" icon="i-lucide-arrow-left" :label="t('notFound.backToDashboard')" @click="goBack" />
    </section>
  </main>
</template>
