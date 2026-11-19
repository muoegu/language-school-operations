type ApiErrorPayload = {
  data?: {
    error?: {
      code?: string
      message?: string
    }
  }
}

function toApiError(error: unknown) {
  return (error ?? {}) as ApiErrorPayload
}

export function getApiErrorCode(error: unknown) {
  return toApiError(error).data?.error?.code
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  return toApiError(error).data?.error?.message ?? fallback
}
