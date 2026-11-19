import { useRouter } from 'vue-router'

type RouterHistoryState = {
  back?: string | null
}

/**
 * Go to the previous in-app route and use a safe destination for direct access.
 * Vue Router stores the previous route in history.state.back, unlike
 * window.history.length which also counts pages outside this application.
 */
export function useSmartBack(fallback: string) {
  const router = useRouter()

  function goBack() {
    if (typeof window !== 'undefined') {
      const state = window.history.state as RouterHistoryState | null
      if (state?.back) {
        router.back()
        return
      }
    }

    void router.replace(fallback)
  }

  return { goBack }
}
