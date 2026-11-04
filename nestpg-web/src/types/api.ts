export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type Primitive = string | number | boolean | null | undefined

export type ApiQueryParams = Record<string, Primitive>

export interface ApiErrorState {
  message: string
}

export interface ApiListResponse<T> {
  items: T[]
}

export interface PaginationState {
  page: number
  pageSize: number
}

export interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface ApiPaginatedResponse<T> extends ApiListResponse<T> {
  pagination: PaginationMeta
}
