<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useGetAuthDemoOptions, usePostAuthDemoLogin } from '../api/generated/hooks'
import { useAuth } from '../composables/useAuth'
import type { SupportedLocale } from '../i18n'
import { loginFormSchema } from '../validation/formSchemas'

const router = useRouter()

const route = useRoute()

const { setCurrentUser } = useAuth()

const { t, locale } = useI18n()

const languageOptions = computed(() => [
  { label: t('common.japanese'), value: 'ja' },
  { label: t('common.traditionalChinese'), value: 'zh-TW' },
])

function changeLocale(value: string) {
  if (value === 'ja' || value === 'zh-TW') {
    locale.value = value as SupportedLocale
  }
}

watch(locale, (value) => {
  localStorage.setItem('portfolio-locale', value)
})

const optionsQuery = useGetAuthDemoOptions()

const loginMutation = usePostAuthDemoLogin()

const selectedUserId = ref('')

const password = ref('')

const errorMessage = ref('')

const userOptions = computed(() =>
  (optionsQuery.data.value?.data ?? []).map((user) => ({
    label: `${user.displayName}（${user.role}）`,
    value: user.userId,
    role: user.role,
  })),
)

watch(
  userOptions,
  (options) => {
    if (!selectedUserId.value && options.length > 0) {
      selectedUserId.value = options.find((option) => option.role === 'representative')?.value ?? options[0].value
    }
  },
  { immediate: true },
)

function submit() {
  errorMessage.value = ''

  const result = loginFormSchema.safeParse({ userId: selectedUserId.value })
  if (!result.success) {
    errorMessage.value = t('login.userRequired')

    return
  }

  loginMutation.mutate(
    { body: { userId: selectedUserId.value, password: password.value || undefined } },
    {
      onSuccess: (response) => {
        setCurrentUser(response.data)
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
        router.replace(redirect)
      },
      onError: () => {
        errorMessage.value = t('login.failedTitle')
      },
    },
  )
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-8 flex flex-col items-center text-center">
        <div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-sky-600 text-lg font-bold text-white">
          L
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ t('login.title') }}</h1>
        <p class="mt-2 text-sm text-slate-500">{{ t('app.system') }}</p>
        <USelectMenu
          :model-value="locale"
          :items="languageOptions"
          value-key="value"
          size="sm"
          class="mt-4 w-40"
          leading-icon="i-lucide-globe-2"
          :aria-label="t('common.language')"
          @update:model-value="changeLocale"
        />
      </div>

      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <UFormField :label="t('login.user')" required>
          <USelectMenu v-model="selectedUserId" :items="userOptions" value-key="value" class="w-full" />
          <p class="mt-1.5 text-xs text-slate-500">{{ t('login.roleHint') }}</p>
        </UFormField>

        <UFormField :label="t('login.password')">
          <UInput v-model="password" type="password" :placeholder="t('login.passwordPlaceholder')" class="w-full" />
        </UFormField>

        <p class="flex items-center justify-center gap-2 text-xs text-slate-500">
          <span class="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {{ t('login.demoTitle') }}
          </span>
          <span>{{ t('login.demoDescription') }}</span>
        </p>
        <UAlert v-if="errorMessage" color="error" :title="t('login.failedTitle')" :description="errorMessage" />

        <UButton :label="t('login.title')" type="submit" block />
      </form>
    </section>
  </main>
</template>
