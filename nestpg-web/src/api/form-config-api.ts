import { apiGet, apiPut } from './api'
import { getDefaultFormConfig, type FormConfig } from '@/config/form-config-defaults'

type FormConfigResponse = {
  items: FormConfig[]
}

export async function getFormConfigs(formKeys?: string[]) {
  const params = formKeys && formKeys.length > 0 ? { keys: formKeys.join(',') } : undefined
  return apiGet<FormConfigResponse>('/form-configs', params)
}

export async function getAdminFormConfigs(formKeys?: string[]) {
  const params = formKeys && formKeys.length > 0 ? { keys: formKeys.join(',') } : undefined
  return apiGet<FormConfigResponse>('/admin/form-configs', params)
}

export async function updateAdminFormConfig(formKey: string, payload: Pick<FormConfig, 'title' | 'fields'>) {
  return apiPut<FormConfig, Pick<FormConfig, 'title' | 'fields'>>(`/admin/form-configs/${formKey}`, payload)
}

export async function getEffectiveFormConfig(formKey: string) {
  const { items } = await getFormConfigs([formKey])
  return items[0] ?? getDefaultFormConfig(formKey)
}
