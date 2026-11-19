<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../composables/useAuth'
import type { SupportedLocale } from '../i18n'
import NotificationCenter from '../components/notifications/NotificationCenter.vue'

const route = useRoute()

const router = useRouter()

const {
  currentUser,
  isTeacher,
  isStaff,
  canViewStudents,
  canViewTeachers,
  canViewCatalog,
  canViewPaymentData,
  canManageSchedule,
  logout,
} = useAuth()

const { t, locale } = useI18n()

const commandPaletteOpen = ref(false)

const navigationItems = computed(() => [
  {
    label: t('nav.dashboard'),
    to: '/',
    icon: 'i-lucide-layout-dashboard',
  },
  ...(canManageSchedule.value || isStaff.value
    ? [
        {
          label: t('nav.lessons'),
          to: '/lessons',
          icon: 'i-lucide-calendar-days',
        },
      ]
    : []),
  ...(canViewStudents.value
    ? [
        {
          label: isTeacher.value ? t('students.assignedTitle') : t('nav.students'),
          to: '/students',
          icon: 'i-lucide-users',
        },
      ]
    : []),
  ...(canViewTeachers.value
    ? [
        {
          label: t('nav.teachers'),
          to: '/teachers',
          icon: 'i-lucide-graduation-cap',
        },
      ]
    : []),
  ...(canViewCatalog.value
    ? [
        {
          label: t('nav.textbooks'),
          to: '/textbooks',
          icon: 'i-lucide-book-open',
        },
      ]
    : []),
  ...(canViewCatalog.value
    ? [
        {
          label: t('nav.lessonPrices'),
          to: '/lesson-prices',
          icon: 'i-lucide-school',
        },
      ]
    : []),
  ...(canViewPaymentData.value
    ? [
        {
          label: t('nav.paymentReports'),
          to: '/payment-reports',
          icon: 'i-lucide-chart-column',
        },
      ]
    : []),
])

const commandGroups = computed(() => [
  {
    id: 'navigation',
    label: t('common.menu'),
    items: navigationItems.value.map((item) => ({
      ...item,
      onSelect: () => navigateFromCommand(item.to),
    })),
  },
])

const languageOptions = computed(() => [
  { label: t('common.japanese'), value: 'ja' },
  { label: t('common.traditionalChinese'), value: 'zh-TW' },
])

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

function changeLocale(value: string) {
  if (value === 'ja' || value === 'zh-TW') {
    locale.value = value as SupportedLocale
  }
}

watch(locale, (value) => {
  localStorage.setItem('portfolio-locale', value)
})

function closeCommandPalette() {
  commandPaletteOpen.value = false
}

function navigateFromCommand(path: string) {
  closeCommandPalette()
  void router.push(path)
}

function handleControlK(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
  }
}

function handleLogout() {
  logout().finally(() => router.replace('/login'))
}

onMounted(() => window.addEventListener('keydown', handleControlK))
onBeforeUnmount(() => window.removeEventListener('keydown', handleControlK))
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <RouterLink
        to="/"
        class="flex h-16 items-center gap-3 border-b border-slate-200 px-6"
        :aria-label="t('nav.dashboard')"
      >
        <div class="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-white">
          <UIcon name="i-lucide-school" class="size-5" aria-hidden="true" />
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ t('app.name') }}</p>
          <p v-if="t('app.subtitle')" class="text-xs text-slate-500">{{ t('app.subtitle') }}</p>
        </div>
      </RouterLink>

      <nav class="flex-1 space-y-1 p-4" :aria-label="t('nav.mainMenu')">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isActive(item.to) ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          "
        >
          <UIcon :name="item.icon" class="size-5" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-200 p-4">
        <div v-if="currentUser" class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-xs font-medium text-slate-700">{{ currentUser.displayName }}</p>
            <p class="mt-1 text-[11px] text-slate-400">{{ currentUser.role }}</p>
          </div>
          <UTooltip :text="t('common.logout')">
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="t('common.logout')"
              @click="handleLogout"
            />
          </UTooltip>
        </div>
      </div>
    </aside>

    <div class="lg:pl-64">
      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6"
      >
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            class="lg:hidden"
            :aria-label="t('common.openMenu')"
            @click="commandPaletteOpen = true"
          />
        </div>
        <div class="flex items-center gap-2">
          <NotificationCenter />
          <UButton
            icon="i-lucide-search"
            color="neutral"
            variant="outline"
            class="inline-flex"
            :label="t('common.menuSearchPlaceholder')"
            @click="commandPaletteOpen = true"
          />
          <USelectMenu
            :model-value="locale"
            :items="languageOptions"
            value-key="value"
            size="sm"
            class="w-28"
            leading-icon="i-lucide-globe-2"
            :aria-label="t('common.language')"
            @update:model-value="changeLocale"
          />
          <div v-if="currentUser" class="flex items-center gap-2 border-l border-slate-200 pl-2 lg:hidden">
            <div class="min-w-0 max-w-28 text-right">
              <p class="truncate text-xs font-medium text-slate-700">{{ currentUser.displayName }}</p>
              <p class="truncate text-[10px] text-slate-400">{{ currentUser.role }}</p>
            </div>
            <UTooltip :text="t('common.logout')">
              <UButton
                icon="i-lucide-log-out"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="t('common.logout')"
                @click="handleLogout"
              />
            </UTooltip>
          </div>
        </div>
      </header>

      <main class="min-h-[calc(100vh-4rem)] p-4 sm:p-6">
        <slot />
      </main>
    </div>

    <UDashboardSearch
      v-model:open="commandPaletteOpen"
      :groups="commandGroups"
      :placeholder="t('common.menuSearchPlaceholder')"
      :title="t('common.menu')"
      shortcut="meta_k"
      :color-mode="false"
      :fullscreen="false"
      :close="true"
    />
  </div>
</template>
