import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/components/shared/**/*.vue',
        'src/components/students/StudentFormModal.vue',
        'src/components/teachers/TeacherFormModal.vue',
        'src/composables/useApiError.ts',
        'src/composables/useAuth.ts',
        'src/utils/**/*.ts',
        'src/validation/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
