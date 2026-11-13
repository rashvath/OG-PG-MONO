import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/lib/auth'
import { clearSession, getStoredToken, isTokenValid } from '@/lib/session'
import type { Role } from '@/lib/types'

interface ProtectedRouteProps {
  allow: Role
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { role } = useAuth()
  const token = getStoredToken()
  const tokenValid = isTokenValid(token)

  useEffect(() => {
    if (!tokenValid) {
      clearSession()
    }
  }, [tokenValid])

  if (!tokenValid) {
    return <Navigate to="/" replace />
  }
  if (role !== allow) {
    return <Navigate to="/auth/login" replace />
  }
  return <Outlet />
}
