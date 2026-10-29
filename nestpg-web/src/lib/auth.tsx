import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiClient, toApiError } from '@/api/http'
import type { Role } from './types'

const TOKEN_STORAGE_KEY = 'nestpg-token'
const USER_STORAGE_KEY = 'nestpg-user'

type AuthUser = {
  id: string
  role: Role
  name: string
}

interface AuthContextValue {
  role: Role | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

type RegisterPayload = {
  name: string
  email: string
  phone: string
  password: string
  role: Exclude<Role, 'admin'>
  pgName?: string
  pgAddress?: string
  area?: string
  description?: string
  numberOfRooms?: number
  photos?: string[]
  rent?: number
  amenities?: string[]
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  })

  const role = user?.role ?? null

  const value = useMemo(
    () => ({
      role,
      user,
      login: async (email: string, password: string) => {
        try {
          const { data } = await apiClient.post<{
            message?: string
            token?: string
            user?: AuthUser
          }>('/auth/login', { email, password })

          if (!data.token || !data.user) {
            throw new Error('Unable to log in')
          }

          localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
          setUser(data.user)
          return data.user
        } catch (error) {
          throw new Error(toApiError(error, 'Unable to log in'))
        }
      },
      register: async (payload: RegisterPayload) => {
        try {
          await apiClient.post('/auth/register', payload)
        } catch (error) {
          throw new Error(toApiError(error, 'Unable to register'))
        }
      },
      logout: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        setUser(null)
      },
    }),
    [role, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
