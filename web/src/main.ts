import './assets/css/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import { useAuth } from './composables/useAuth'
import { i18n } from './i18n'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/DashboardPage.vue'),
    },
    {
      path: '/attendance',
      redirect: '/',
    },
    {
      path: '/students',
      component: () => import('./pages/HomePage.vue'),
      meta: { permission: 'viewStudents' },
    },
    {
      path: '/students/:studentId',
      component: () => import('./pages/StudentDetailPage.vue'),
      meta: { permission: 'viewStudents' },
    },
    {
      path: '/print/payment-record/:paymentRecordId',
      component: () => import('./pages/InvoicePrintPage.vue'),
      meta: { print: true, permission: 'viewPaymentData' },
    },
    {
      path: '/teachers',
      component: () => import('./pages/TeachersPage.vue'),
      meta: { permission: 'viewTeachers' },
    },
    {
      path: '/lessons',
      component: () => import('./pages/LessonsPage.vue'),
    },
    {
      path: '/lessons/:lessonId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})',
      component: () => import('./pages/LessonDetailPage.vue'),
    },
    {
      path: '/textbooks',
      component: () => import('./pages/TextbooksPage.vue'),
      meta: { permission: 'viewCatalog' },
    },
    {
      path: '/lesson-prices',
      component: () => import('./pages/LessonPricesPage.vue'),
      meta: { permission: 'viewCatalog' },
    },
    {
      path: '/payment-reports',
      component: () => import('./pages/PaymentReportsPage.vue'),
      meta: { permission: 'viewPaymentData' },
    },
    {
      path: '/login',
      component: () => import('./pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('./pages/NotFoundPage.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const { ensureSession, canViewStudents, canViewTeachers, canViewCatalog, canManageTeachers, canViewPaymentData } =
    useAuth()

  if (to.meta.public) {
    return true
  }

  if (!(await ensureSession())) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  const permissionAllowed = {
    viewStudents: canViewStudents.value,
    viewTeachers: canViewTeachers.value,
    viewCatalog: canViewCatalog.value,
    manageTeachers: canManageTeachers.value,
    viewPaymentData: canViewPaymentData.value,
  } as const
  const requiredPermission = to.meta.permission
  if (requiredPermission && !permissionAllowed[requiredPermission]) return '/'

  return true
})

createApp(App).use(router).use(ui).use(i18n).use(VueQueryPlugin).mount('#app')
