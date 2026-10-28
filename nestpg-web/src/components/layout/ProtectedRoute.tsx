import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'

interface ProtectedRouteProps {
  allow: Role
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { role } = useAuth()
  if (role !== allow) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
