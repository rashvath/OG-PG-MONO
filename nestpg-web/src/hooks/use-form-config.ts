import { useEffect, useMemo, useState } from 'react'

import { getEffectiveFormConfig } from '@/api/form-config-api'
import { getDefaultFormConfig, type FormConfig } from '@/config/form-config-defaults'

const formConfigCache = new Map<string, FormConfig>()

function fieldMap(config: FormConfig | null) {
  const map = new Map<string, { label: string; required: boolean }>()
  for (const field of config?.fields ?? []) {
    map.set(field.key, { label: field.label, required: field.required })
  }
  return map
}

export function useFormConfig(formKey: string) {
  const [config, setConfig] = useState<FormConfig | null>(() => formConfigCache.get(formKey) ?? getDefaultFormConfig(formKey))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = formConfigCache.get(formKey)
    if (cached) {
      setConfig(cached)
      return
    }

    let mounted = true
    setLoading(true)
    getEffectiveFormConfig(formKey)
      .then((item) => {
        if (!mounted || !item) {
          return
        }
        formConfigCache.set(formKey, item)
        setConfig(item)
      })
      .catch(() => {
        if (!mounted) {
          return
        }
        setConfig(getDefaultFormConfig(formKey))
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [formKey])

  const fields = useMemo(() => fieldMap(config), [config])

  const isRequired = (fieldKey: string) => fields.get(fieldKey)?.required ?? false
  const getLabel = (fieldKey: string, fallback: string) => fields.get(fieldKey)?.label ?? fallback
  const requiredFieldKeys = useMemo(
    () => new Set(Array.from(fields.entries()).filter(([, value]) => value.required).map(([key]) => key)),
    [fields],
  )

  return {
    config,
    loading,
    isRequired,
    getLabel,
    requiredFieldKeys,
  }
}

export function invalidateFormConfigCache(formKey?: string) {
  if (formKey) {
    formConfigCache.delete(formKey)
    return
  }

  formConfigCache.clear()
}
