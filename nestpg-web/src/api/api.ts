import type { AxiosRequestConfig } from 'axios'

import { apiClient, toApiError } from './http'
import type { ApiQueryParams } from '@/types/api'

export const API_ENDPOINTS = {
  listings: {
    root: '/listings',
    byId: (id: string) => `/listings/${id}`,
  },
  uploads: {
    images: '/uploads/images',
  },
  owner: {
    summary: '/owner/dashboard/summary',
    pgs: '/owner/pgs',
  },
  admin: {
    summary: '/admin/dashboard/summary',
    pgs: '/admin/pgs',
  },
} as const

function withQueryParams(url: string, params?: ApiQueryParams) {
  if (!params) {
    return url
  }

  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  return query.size ? `${url}?${query.toString()}` : url
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const method = String(config.method ?? 'GET').toUpperCase()
  if (method === 'DELETE') {
    const shouldDelete = window.confirm('Are you sure you want to delete this item?')
    if (!shouldDelete) {
      throw new Error('Delete cancelled')
    }
  }

  try {
    const response = await apiClient.request<T>(config)
    return response.data
  } catch (error) {
    throw new Error(toApiError(error))
  }
}

export function apiRequest<T>(config: AxiosRequestConfig) {
  return request<T>(config)
}

export function apiGet<T>(url: string, params?: ApiQueryParams, config?: AxiosRequestConfig) {
  return request<T>({ ...config, url: withQueryParams(url, params), method: 'GET' })
}

export function apiPost<TResponse, TPayload = unknown>(url: string, payload?: TPayload, config?: AxiosRequestConfig) {
  return request<TResponse>({ ...config, url, method: 'POST', data: payload })
}

export function apiPut<TResponse, TPayload = unknown>(url: string, payload?: TPayload, config?: AxiosRequestConfig) {
  return request<TResponse>({ ...config, url, method: 'PUT', data: payload })
}

export function apiPatch<TResponse, TPayload = unknown>(url: string, payload?: TPayload, config?: AxiosRequestConfig) {
  return request<TResponse>({ ...config, url, method: 'PATCH', data: payload })
}

export function apiDelete<TResponse>(url: string, config?: AxiosRequestConfig) {
  return request<TResponse>({ ...config, url, method: 'DELETE' })
}
