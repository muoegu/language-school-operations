import { useI18n } from 'vue-i18n'

type Dependency = { type: string; count: number }
type ApiError = { code?: string; details?: { dependencies?: Dependency[] } }

function getApiError(error: unknown): ApiError | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { data?: { error?: ApiError }; error?: { error?: ApiError } }
  return candidate.data?.error ?? candidate.error?.error
}

export function useDeleteErrorToast() {
  const { t } = useI18n()
  const toast = useToast()

  function show(error: unknown) {
    const apiError = getApiError(error)
    if (apiError?.code === 'RESOURCE_IN_USE') {
      const dependencies = apiError.details?.dependencies ?? []
      const labels = dependencies.map(
        (dependency) => `${t(`deleteDependencies.${dependency.type}`)}（${dependency.count}）`,
      )
      toast.add({
        title: t('toast.resourceInUse'),
        description:
          labels.length > 0 ? t('toast.resourceInUseDescription', { dependencies: labels.join('、') }) : undefined,
        color: 'error',
      })
      return
    }
    toast.add({ title: t('toast.operationFailed'), color: 'error' })
  }

  return { show }
}
