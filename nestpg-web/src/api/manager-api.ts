import { apiClient } from './http'

export const managerModules = ['pgs', 'residents', 'inventory', 'enquiries', 'finance', 'documents', 'staff', 'tenantReview'] as const
export type ManagerModule = (typeof managerModules)[number]
export type ManagerPermissions = Record<ManagerModule, Record<'read' | 'create' | 'update' | 'delete', boolean>>
export type ManagerAccess = { permissions: ManagerPermissions; pgId: { _id: string; name: string; area: string } | string }

export async function getManagerAccess() {
  const { data } = await apiClient.get<{ item: ManagerAccess }>('/owner/manager/access')
  return data.item
}

export type ManagerRecord = { _id: string; managerId: { _id: string; name: string; email: string; phone: string; status: string }; ownerId?: { name: string } | null; pgId: { name: string; area: string }; permissions: ManagerPermissions }
export async function getOwnerManagers() {
  const { data } = await apiClient.get<{ items: ManagerRecord[] }>('/owner/managers')
  return data.items
}

export async function createOwnerManager(payload: { name: string; email: string; phone: string; pgId: string; permissions: ManagerPermissions }) {
  const { data } = await apiClient.post<{ item: { id: string; name: string; email: string; phone: string }; temporaryPassword: string }>('/owner/managers', payload)
  return data
}

export async function updateOwnerManager(id: string, permissions: ManagerPermissions, status?: 'active' | 'blocked') {
  const { data } = await apiClient.patch(`/owner/managers/${id}`, { permissions, status })
  return data
}

export async function deleteOwnerManager(id: string) {
  const { data } = await apiClient.delete(`/owner/managers/${id}`)
  return data
}

export async function getAdminManagers() {
  const { data } = await apiClient.get<{ items: ManagerRecord[] }>('/admin/managers')
  return data.items
}

export async function createAdminManager(payload: { name: string; email: string; phone: string; pgId: string; permissions: ManagerPermissions }) {
  const { data } = await apiClient.post<{ item: { id: string; name: string; email: string; phone: string }; temporaryPassword: string }>('/admin/managers', payload)
  return data
}

export async function updateAdminManager(id: string, permissions: ManagerPermissions, status?: 'active' | 'blocked') {
  const { data } = await apiClient.patch(`/admin/managers/${id}`, { permissions, status })
  return data
}

export async function deleteAdminManager(id: string) {
  const { data } = await apiClient.delete(`/admin/managers/${id}`)
  return data
}
