import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { UsersRound } from 'lucide-react'

import { AppTable } from '@/components/data-display/AppTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { AppDialog } from '@/components/ui/AppDialog'
import { getOwnerPgs, type OwnerPg } from '@/api/owner-api'
import { getAdminPgs } from '@/api/admin-api'
import {
  createAdminManager,
  createOwnerManager,
  deleteAdminManager,
  deleteOwnerManager,
  getAdminManagers,
  getOwnerManagers,
  managerModules,
  updateAdminManager,
  updateOwnerManager,
  type ManagerPermissions,
  type ManagerRecord,
} from '@/api/manager-api'
import { toApiError } from '@/api/http'
import { useToast } from '@/lib/toast'

const actions = ['read', 'create', 'update', 'delete'] as const
const actionLabels: Record<(typeof actions)[number], string> = {
  read: 'Read',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}
const moduleLabels: Record<(typeof managerModules)[number], string> = {
  pgs: 'PG details',
  residents: 'Residents',
  inventory: 'Rooms and beds',
  enquiries: 'Enquiries',
  finance: 'Finance',
  documents: 'Documents',
  staff: 'Staff',
  tenantReview: 'Tenant requests',
}

function blankPermissions(): ManagerPermissions {
  return Object.fromEntries(
    managerModules.map((module) => [module, { read: false, create: false, update: false, delete: false }]),
  ) as ManagerPermissions
}

type Credentials = { email: string; password: string }

type ManagerManagementPageProps = { scope: 'owner' | 'admin' }
type ManagerPgOption = Pick<OwnerPg, '_id' | 'name' | 'area'>

export function ManagerManagementPage({ scope }: ManagerManagementPageProps) {
  const toast = useToast()
  const [pgs, setPgs] = useState<ManagerPgOption[]>([])
  const [managers, setManagers] = useState<ManagerRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ManagerRecord | null>(null)
  const [managerToRevoke, setManagerToRevoke] = useState<ManagerRecord | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pgId, setPgId] = useState('')
  const [permissions, setPermissions] = useState<ManagerPermissions>(blankPermissions)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [pgResult, managerResult] = scope === 'admin'
        ? await Promise.all([getAdminPgs(), getAdminManagers()])
        : await Promise.all([getOwnerPgs(), getOwnerManagers()])
      setPgs(pgResult.items)
      setManagers(managerResult)
      setPgId((current) => current || pgResult.items[0]?._id || '')
    } catch (error) {
      setLoadError(toApiError(error, 'Unable to load manager information.'))
    } finally {
      setIsLoading(false)
    }
  }, [scope])

  useEffect(() => {
    void load()
  }, [load])

  const closeDialog = useCallback(() => {
    if (!isSaving) setIsDialogOpen(false)
  }, [isSaving])

  const startCreate = () => {
    setEditing(null)
    setName('')
    setEmail('')
    setPhone('')
    setPermissions(blankPermissions())
    setCredentials(null)
    setFormError('')
    setIsDialogOpen(true)
  }

  const startEdit = (record: ManagerRecord) => {
    setEditing(record)
    setPermissions(record.permissions)
    setCredentials(null)
    setFormError('')
    setIsDialogOpen(true)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return
    setFormError('')
    if (!editing && !pgId) {
      setFormError('Select a PG before creating a manager account.')
      return
    }

    setIsSaving(true)
    try {
      if (editing) {
        if (scope === 'admin') await updateAdminManager(editing.managerId._id, permissions)
        else await updateOwnerManager(editing.managerId._id, permissions)
        toast.success('Manager permissions updated')
        setIsDialogOpen(false)
        void load()
      } else {
        const payload = { name: name.trim(), email: email.trim(), phone, pgId, permissions }
        const result = scope === 'admin' ? await createAdminManager(payload) : await createOwnerManager(payload)
        setCredentials({ email: result.item.email, password: result.temporaryPassword })
        toast.success('Manager account created')
        void load()
      }
    } catch (error) {
      const message = toApiError(error, 'Unable to save manager changes.')
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const revokeManager = async () => {
    if (!managerToRevoke || isSaving) return
    setIsSaving(true)
    try {
      if (scope === 'admin') await deleteAdminManager(managerToRevoke.managerId._id)
      else await deleteOwnerManager(managerToRevoke.managerId._id)
      toast.success('Manager access revoked')
      setManagerToRevoke(null)
      void load()
    } catch (error) {
      toast.error(toApiError(error, 'Unable to revoke manager access.'))
    } finally {
      setIsSaving(false)
    }
  }

  const togglePermission = (module: (typeof managerModules)[number], action: (typeof actions)[number]) => {
    setPermissions((current) => ({
      ...current,
      [module]: { ...current[module], [action]: !current[module][action] },
    }))
  }

  const copyCredentials = async () => {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`)
      toast.success('Sign-in details copied')
    } catch {
      toast.error('Copy is unavailable. Select and copy the sign-in details.')
    }
  }

  return (
    <section className="manager-page">
      <PageHeader
        title="Managers"
        subtitle={scope === 'admin' ? 'Create manager accounts and assign them to any PG.' : 'Create manager accounts for your PGs and choose which information and actions they can access.'}
        action={<Button onClick={startCreate} disabled={!pgs.length || isLoading}>Add Manager</Button>}
      />

      {isLoading ? (
        <Card className="manager-page-state" padding="md"><p>Loading managers…</p></Card>
      ) : loadError ? (
        <Card className="manager-page-state" padding="md">
          <p role="alert">{loadError}</p>
          <Button variant="secondary" onClick={() => void load()}>Try again</Button>
        </Card>
      ) : managers.length ? (
        <AppTable headers={scope === 'admin' ? ['Manager', 'Owner', 'Assigned PG', 'Access', 'Status', 'Actions'] : ['Manager', 'Assigned PG', 'Access', 'Status', 'Actions']}>
          {managers.map((record) => (
            <tr key={record._id}>
              <td>
                <div className="manager-name-cell">
                  <strong>{record.managerId.name}</strong>
                  <span>{record.managerId.email}</span>
                </div>
              </td>
              {scope === 'admin' ? <td>{record.ownerId?.name ?? 'Unassigned'}</td> : null}
              <td>{record.pgId.name}<span className="manager-area">{record.pgId.area}</span></td>
              <td>
                <div className="manager-access-list" aria-label="Assigned permissions">
                  {managerModules.filter((module) => actions.some((action) => record.permissions[module][action])).length ? (
                    managerModules
                      .filter((module) => actions.some((action) => record.permissions[module][action]))
                      .map((module) => (
                        <span key={module}>
                          {moduleLabels[module]}: {actions.filter((action) => record.permissions[module][action]).map((action) => actionLabels[action]).join(', ')}
                        </span>
                      ))
                  ) : <span>No access</span>}
                </div>
              </td>
              <td><Badge variant={record.managerId.status === 'active' ? 'approved' : 'rejected'}>{record.managerId.status}</Badge></td>
              <td>
                <div className="manager-row-actions">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(record)}>Permissions</Button>
                  <Button size="sm" variant="danger" onClick={() => setManagerToRevoke(record)}>Revoke access</Button>
                </div>
              </td>
            </tr>
          ))}
        </AppTable>
      ) : (
        <Card padding="sm" className="manager-empty-card">
          <EmptyState
            icon={<span className="manager-empty-icon"><UsersRound size={24} aria-hidden="true" /></span>}
            title={pgs.length ? 'No managers yet' : scope === 'admin' ? 'No PGs available' : 'Add a PG before creating a manager'}
            description={pgs.length ? 'Managers can sign in to the PGs and modules you assign to them.' : scope === 'admin' ? 'Create or publish a PG before assigning a manager.' : 'A manager account must be linked to one of your PGs.'}
            action={pgs.length ? <Button onClick={startCreate}>Add Manager</Button> : undefined}
          />
        </Card>
      )}

      <AppDialog
        open={isDialogOpen}
        title={credentials ? 'Manager account created' : editing ? 'Edit manager permissions' : 'Create manager'}
        subtitle={credentials ? 'Share these sign-in details with the manager.' : scope === 'admin' ? 'Assign any PG and select the access this manager needs.' : 'Assign one of your PGs and select the access this manager needs.'}
        onClose={closeDialog}
        className="manager-dialog"
        footer={credentials ? (
          <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="manager-form" loading={isSaving}>
              {editing ? 'Save permissions' : 'Create account'}
            </Button>
          </>
        )}
      >
        {credentials ? (
          <div className="manager-credentials" role="status">
            <p>The temporary password is shown once. Copy it before closing this window.</p>
            <dl>
              <div><dt>Email</dt><dd>{credentials.email}</dd></div>
              <div><dt>Temporary password</dt><dd>{credentials.password}</dd></div>
            </dl>
            <Button variant="secondary" onClick={() => void copyCredentials()}>Copy sign-in details</Button>
          </div>
        ) : (
          <form id="manager-form" onSubmit={(event) => void submit(event)}>
            {!editing ? (
              <div className="manager-fields-grid">
                <Input label="Name" required minLength={2} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} />
                <Input label="Email address" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSaving} />
                <Input label="Phone number" required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" hint="Enter 10 digits." value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} disabled={isSaving} />
                <Select label="PG" required value={pgId} onChange={(event) => setPgId(event.target.value)} disabled={isSaving}>
                  {pgs.map((pg) => <option key={pg._id} value={pg._id}>{pg.name} · {pg.area}</option>)}
                </Select>
              </div>
            ) : (
              <p className="manager-editing-note">{editing.managerId.name} · {editing.pgId.name}</p>
            )}

            <fieldset className="manager-permissions" disabled={isSaving}>
              <legend>Module permissions</legend>
              <div className="manager-permission-grid" role="group" aria-label="Manager permissions">
                <span className="manager-permission-header">Area</span>
                {actions.map((action) => <span className="manager-permission-header" key={action}>{actionLabels[action]}</span>)}
                {managerModules.map((module) => (
                  <div className="manager-permission-row" role="row" key={module}>
                    <strong>{moduleLabels[module]}</strong>
                    {actions.map((action) => (
                      <label key={action} className="manager-permission-cell">
                        <input
                          type="checkbox"
                          checked={permissions[module][action]}
                          onChange={() => togglePermission(module, action)}
                          aria-label={`${actionLabels[action]} ${moduleLabels[module]}`}
                        />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>
            {formError ? <p className="manager-form-error" role="alert">{formError}</p> : null}
          </form>
        )}
      </AppDialog>

      <AppDialog
        open={Boolean(managerToRevoke)}
        title="Revoke manager access?"
        subtitle={managerToRevoke ? `${managerToRevoke.managerId.name} will no longer be able to sign in.` : undefined}
        onClose={() => { if (!isSaving) setManagerToRevoke(null) }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setManagerToRevoke(null)} disabled={isSaving}>Cancel</Button>
            <Button variant="danger" onClick={() => void revokeManager()} loading={isSaving}>Revoke access</Button>
          </>
        }
      >
        <p>They will lose access to this PG and its information immediately.</p>
      </AppDialog>
    </section>
  )
}
