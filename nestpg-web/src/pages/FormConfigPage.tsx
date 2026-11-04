import { useEffect, useMemo, useState } from 'react'

import { getAdminFormConfigs, updateAdminFormConfig } from '@/api/form-config-api'
import type { FormConfig } from '@/config/form-config-defaults'
import { invalidateFormConfigCache } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

export function AdminFormConfigPage() {
  const toast = useToast()
  const [items, setItems] = useState<FormConfig[]>([])
  const [savingKey, setSavingKey] = useState('')

  const sorted = useMemo(() => [...items].sort((a, b) => a.title.localeCompare(b.title)), [items])

  const load = () => {
    getAdminFormConfigs()
      .then((data) => setItems(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load form configuration'))
  }

  useEffect(() => {
    load()
  }, [])

  const updateRequired = (formKey: string, fieldKey: string, required: boolean) => {
    setItems((current) =>
      current.map((item) =>
        item.formKey !== formKey
          ? item
          : {
              ...item,
              fields: item.fields.map((field) => (field.key === fieldKey ? { ...field, required } : field)),
            },
      ),
    )
  }

  const saveForm = async (formKey: string) => {
    const form = items.find((item) => item.formKey === formKey)
    if (!form) {
      return
    }

    setSavingKey(formKey)
    try {
      await updateAdminFormConfig(formKey, {
        title: form.title,
        fields: form.fields,
      })
      invalidateFormConfigCache(formKey)
      toast.success('Form configuration saved')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save form configuration')
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">Form configuration</h2>
          <p className="section-sub">Set each field as Required or Optional. Changes apply dynamically to forms.</p>
        </div>
      </div>

      <div className="spaced-top" style={{ display: 'grid', gap: 12 }}>
        {sorted.map((form) => (
          <section key={form.formKey} className="panel finance-panel">
            <div className="admin-table-head" style={{ marginBottom: 8 }}>
              <div>
                <h3>{form.title}</h3>
                <p className="section-sub">Key: {form.formKey}</p>
              </div>
              <button
                type="button"
                className="btn btn-brand"
                onClick={() => saveForm(form.formKey)}
                disabled={savingKey === form.formKey}
              >
                {savingKey === form.formKey ? 'Saving...' : 'Save'}
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Label</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {form.fields.map((field) => (
                  <tr key={field.key}>
                    <td>{field.key}</td>
                    <td>{field.label}</td>
                    <td>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => updateRequired(form.formKey, field.key, event.target.checked)}
                        />
                        <span>{field.required ? 'Required' : 'Optional'}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  )
}
