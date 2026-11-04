import type { ReactNode } from 'react'

export interface SelectOption {
  label: string
  value: string
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  cell?: (row: T) => ReactNode
  className?: string
}
