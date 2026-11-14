import { FORM_CONFIG_DEFAULTS, type FormConfigDefault } from '../config/form-config.defaults'
import { FormConfigModel } from '../models/FormConfig'

type StoredFormConfig = {
  formKey: string
  title: string
  fields: Array<{ key: string; label: string; required: boolean }>
  updatedAt?: Date
}

const FORM_KEY_ALIASES: Record<string, string> = {
  'auth.tenantRegistertion': 'auth.tenantRegistration',
}

function normalizeFormKey(formKey: string) {
  return FORM_KEY_ALIASES[formKey] ?? formKey
}

function getQueryKeys(formKeys: string[]) {
  const keys = new Set<string>()

  for (const key of formKeys) {
    const normalized = normalizeFormKey(key)
    keys.add(normalized)

    for (const [alias, canonical] of Object.entries(FORM_KEY_ALIASES)) {
      if (canonical === normalized) {
        keys.add(alias)
      }
    }
  }

  return [...keys]
}

function byFormKey(formKey: string) {
  const normalizedKey = normalizeFormKey(formKey)
  return FORM_CONFIG_DEFAULTS.find((item) => item.formKey === normalizedKey)
}

export function listDefaultFormConfigs() {
  return FORM_CONFIG_DEFAULTS
}

export async function listMergedFormConfigs(formKeys?: string[]) {
  const normalizedKeys = formKeys?.map((key) => normalizeFormKey(key))
  const filter = normalizedKeys && normalizedKeys.length > 0 ? { formKey: { $in: getQueryKeys(normalizedKeys) } } : {}
  const storedRaw = (await FormConfigModel.find(filter).lean()) as StoredFormConfig[]
  const stored = storedRaw.map((item) => ({
    ...item,
    formKey: normalizeFormKey(item.formKey),
  }))
  const storedMap = new Map(stored.map((item) => [item.formKey, item]))

  const defaults = normalizedKeys && normalizedKeys.length > 0
    ? FORM_CONFIG_DEFAULTS.filter((item) => normalizedKeys.includes(item.formKey))
    : FORM_CONFIG_DEFAULTS

  const merged = defaults.map((item) => {
    const existing = storedMap.get(item.formKey)
    if (!existing) {
      return item
    }

    const defaultFieldMap = new Map(item.fields.map((field) => [field.key, field]))
    const mergedFields = item.fields.map((field) => {
      const override = existing.fields.find((entry) => entry.key === field.key)
      return override ? { ...field, required: override.required, label: override.label || field.label } : field
    })

    for (const extra of existing.fields) {
      if (!defaultFieldMap.has(extra.key)) {
        mergedFields.push(extra)
      }
    }

    return {
      formKey: item.formKey,
      title: existing.title || item.title,
      fields: mergedFields,
    }
  })

  for (const item of stored) {
    if (!merged.some((entry) => entry.formKey === item.formKey)) {
      merged.push(item)
    }
  }

  return merged
}

export async function getMergedFormConfig(formKey: string): Promise<FormConfigDefault | null> {
  const [result] = await listMergedFormConfigs([normalizeFormKey(formKey)])
  return result ?? null
}

export async function upsertFormConfig(formKey: string, payload: { title?: string; fields: Array<{ key: string; label: string; required: boolean }> }, updatedBy?: string) {
  const normalizedKey = normalizeFormKey(formKey)
  const fallback = byFormKey(normalizedKey)

  const title = payload.title?.trim() || fallback?.title || normalizedKey
  const fields = payload.fields
    .map((field) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      required: Boolean(field.required),
    }))
    .filter((field) => field.key.length > 0 && field.label.length > 0)

  const next = await FormConfigModel.findOneAndUpdate(
    { formKey: normalizedKey },
    {
      formKey: normalizedKey,
      title,
      fields,
      ...(updatedBy ? { updatedBy } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return next
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'boolean') {
    return true
  }

  return true
}

export async function validateRequiredFields(formKey: string, payload: Record<string, unknown>) {
  const config = await getMergedFormConfig(formKey)
  if (!config) {
    return {}
  }

  const fieldErrors: Record<string, string> = {}
  for (const field of config.fields) {
    if (!field.required) {
      continue
    }

    if (!hasMeaningfulValue(payload[field.key])) {
      fieldErrors[field.key] = `${field.label} is required`
    }
  }

  return fieldErrors
}
