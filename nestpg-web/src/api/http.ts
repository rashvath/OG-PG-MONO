import axios, { AxiosError } from 'axios'

import { clearSession, getStoredToken } from '@/lib/session'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

type FieldErrorValue = string[] | string

type ErrorEnvelope = {
  message?: string | { formErrors?: string[]; fieldErrors?: Record<string, FieldErrorValue> }
  error?: string
}

function extractErrorMessage(data: ErrorEnvelope, fallback: string) {
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (data.message && typeof data.message === 'object') {
    const formError = data.message.formErrors?.find((item) => item && item.trim().length > 0)
    if (formError) {
      return formError
    }

    const entries = Object.entries(data.message.fieldErrors ?? {})
    for (const [field, value] of entries) {
      if (Array.isArray(value) && value.length > 0 && value[0]) {
        return `${field}: ${value[0]}`
      }

      if (typeof value === 'string' && value.trim()) {
        return `${field}: ${value}`
      }
    }
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error
  }

  return fallback
}

export function toApiError(error: unknown, fallback = 'Request failed') {
  const axiosError = error as AxiosError<ErrorEnvelope>
  const data = axiosError?.response?.data
  if (data) {
    return extractErrorMessage(data, fallback)
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.replace(/^\//, '').startsWith('auth/login')
    ) {
      clearSession()
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.replace('/')
      }
    }
    return Promise.reject(error)
  },
)
