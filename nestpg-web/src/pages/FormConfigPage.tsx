import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { getAdminFormConfigs, updateAdminFormConfig } from '@/api/form-config-api'
import type { FormConfig } from '@/config/form-config-defaults'
import { invalidateFormConfigCache } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

export function AdminFormConfigPage() {
  const toast = useToast()
  const [items, setItems] = useState<FormConfig[]>([])
  const [savingKey, setSavingKey] = useState('')
  const [search, setSearch] = useState('')

  const orderedSections = useMemo(() => {
    const byKey = new Map(items.map((item) => [item.formKey, item]))
    const authOrder = ['auth.register', 'auth.tenantRegistration', 'auth.ownerRegistration', 'auth.login']
    const authItems = authOrder.map((key) => byKey.get(key)).filter((item): item is FormConfig => Boolean(item))
    const authKeys = new Set(authItems.map((item) => item.formKey))
    const otherItems = items.filter((item) => !authKeys.has(item.formKey)).sort((a, b) => a.title.localeCompare(b.title))

    return {
      authItems,
      otherItems,
    }
  }, [items])

  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return orderedSections

    const filterForms = (forms: FormConfig[]) => forms.flatMap((form) => {
      const formMatches = `${form.title} ${form.formKey}`.toLocaleLowerCase().includes(query)
      const fields = formMatches
        ? form.fields
        : form.fields.filter((field) => `${field.key} ${field.label}`.toLocaleLowerCase().includes(query))
      return fields.length ? [{ ...form, fields }] : []
    })

    return {
      authItems: filterForms(orderedSections.authItems),
      otherItems: filterForms(orderedSections.otherItems),
    }
  }, [orderedSections, search])

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

      <label className="form-config-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search forms and fields</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by form or field name"
          aria-label="Search forms and fields"
        />
      </label>

      <div className="spaced-top" style={{ display: 'grid', gap: 12 }}>
        {filteredSections.authItems.length > 0 ? (
          <section className="panel finance-panel" style={{ paddingBottom: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Authentication forms</h3>
            <p className="section-sub" style={{ marginBottom: 0 }}>
              Order: Registration forms first, then Login form.
            </p>
          </section>
        ) : null}

        {[...filteredSections.authItems, ...filteredSections.otherItems].length > 0 ? (
          [...filteredSections.authItems, ...filteredSections.otherItems].map((form) => (
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
          ))
        ) : (
          <section className="panel finance-panel form-config-empty" role="status">
            {search.trim() ? `No forms or fields match “${search.trim()}”.` : 'No form configurations are available.'}
          </section>
        )}
      </div>
    </div>
  )
}
