import { useEffect, useMemo, useState } from 'react'

import { AppTable } from '@/components/data-display/AppTable'
import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import {
  createOwnerLedgerEntriesBulk,
  createOwnerLedgerEntry,
  deleteOwnerBalanceSheet,
  deleteOwnerLedgerEntry,
  exportOwnerBalanceSheetCsv,
  generateOwnerBalanceSheet,
  getOwnerBalanceSheets,
  getOwnerLedgerEntries,
  getOwnerPgs,
  saveOwnerBalanceSheet,
  type OwnerBalanceSheet,
  type OwnerLedgerEntry,
  type OwnerPg,
} from '@/api/owner-api'
import { getAdminBalanceSheets, getAdminLedgerEntries, type AdminBalanceSheet, type AdminLedgerEntry } from '@/api/admin-api'
import { inr } from '@/helpers/format'
import { useToast } from '@/lib/toast'

function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

const BULK_UPLOAD_TEMPLATE = [
  'residentName,amount,entryDate,category,entryType,notes',
  'John,9000,2026-10-01,Rent,income,October rent',
  'Manager,4500,2026-10-01,Electricity Bill,expense,Monthly EB bill',
].join('\n')

export function OwnerBalanceSheetPage() {
  const toast = useToast()
  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [entries, setEntries] = useState<OwnerLedgerEntry[]>([])
  const [sheets, setSheets] = useState<OwnerBalanceSheet[]>([])
  const [isSavingEntry, setIsSavingEntry] = useState(false)
  const [isSavingSheet, setIsSavingSheet] = useState(false)
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [selectedPgId, setSelectedPgId] = useState('')
  const [entryForm, setEntryForm] = useState({
    entryType: 'income' as 'income' | 'expense',
    category: 'Rent',
    amount: 0,
    entryDate: toDateInputValue(),
    residentName: '',
    notes: '',
  })
  const [bulkText, setBulkText] = useState('')
  const [sheetForm, setSheetForm] = useState({
    title: `Balance Sheet - ${new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
    periodStart: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    periodEnd: toDateInputValue(),
    notes: '',
  })
  const [preview, setPreview] = useState<{
    totalIncome: number
    totalExpense: number
    netBalance: number
    entriesCount: number
    incomeByCategory: Array<{ category: string; amount: number }>
    expenseByCategory: Array<{ category: string; amount: number }>
  } | null>(null)

  const load = () => {
    Promise.all([getOwnerPgs(), getOwnerLedgerEntries({ limit: 300 }), getOwnerBalanceSheets({ limit: 200 })])
      .then(([pgData, entryData, sheetData]) => {
        setPgs(pgData.items)
        setEntries(entryData.items)
        setSheets(sheetData.items)
        if (!selectedPgId && pgData.items.length > 0) {
          setSelectedPgId(pgData.items[0]?._id ?? '')
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load balance data'))
  }

  useEffect(() => {
    load()
  }, [])

  const selectedPgName = useMemo(() => pgs.find((item) => item._id === selectedPgId)?.name ?? 'All PGs', [pgs, selectedPgId])

  const addEntry = async () => {
    if (entryForm.amount <= 0) {
      toast.warning('Amount must be greater than 0')
      return
    }

    setIsSavingEntry(true)
    try {
      await createOwnerLedgerEntry({
        pgId: selectedPgId || undefined,
        entryType: entryForm.entryType,
        category: entryForm.category.trim() || 'Other',
        amount: entryForm.amount,
        entryDate: entryForm.entryDate,
        residentName: entryForm.residentName.trim() || undefined,
        notes: entryForm.notes.trim() || undefined,
      })
      setEntryForm((current) => ({
        ...current,
        amount: 0,
        residentName: '',
        notes: '',
      }))
      toast.success('Entry added')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add entry')
    } finally {
      setIsSavingEntry(false)
    }
  }

  const addBulkEntries = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('#'))

    const isHeaderRow = (line: string) => /resident\s*name|entry\s*type|entry\s*date|amount/i.test(line)
    const cleanedLines = lines.filter((line) => !isHeaderRow(line))

    if (cleanedLines.length === 0) {
      toast.warning('Paste at least one row for bulk import')
      return
    }

    const parsed = cleanedLines
      .map((line) => line.split(',').map((part) => part.trim()))
      .map((parts) => {
        const [residentName, amountRaw, dateRaw, categoryRaw, entryTypeRaw, notesRaw] = parts
        const amount = Number(amountRaw)
        const entryType: 'income' | 'expense' = entryTypeRaw === 'expense' ? 'expense' : 'income'

        if (!Number.isFinite(amount) || amount <= 0 || !dateRaw) {
          return null
        }

        return {
          pgId: selectedPgId || undefined,
          residentName: residentName || undefined,
          amount,
          entryDate: dateRaw,
          category: categoryRaw || (entryType === 'income' ? 'Rent' : 'Other Expense'),
          entryType,
          notes: notesRaw || undefined,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (parsed.length === 0) {
      toast.warning('Bulk rows are invalid. Use: residentName,amount,YYYY-MM-DD,category,entryType,notes')
      return
    }

    setIsSavingBulk(true)
    try {
      const result = await createOwnerLedgerEntriesBulk(parsed)
      toast.success(`${result.insertedCount} entries imported`)
      setBulkText('')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import entries')
    } finally {
      setIsSavingBulk(false)
    }
  }

  const createPreview = async () => {
    try {
      const result = await generateOwnerBalanceSheet({
        title: sheetForm.title,
        pgId: selectedPgId || undefined,
        periodStart: sheetForm.periodStart,
        periodEnd: sheetForm.periodEnd,
        notes: sheetForm.notes,
      })
      setPreview({
        totalIncome: result.totalIncome,
        totalExpense: result.totalExpense,
        netBalance: result.netBalance,
        entriesCount: result.entriesCount,
        incomeByCategory: result.incomeByCategory,
        expenseByCategory: result.expenseByCategory,
      })
      toast.success('Balance sheet preview generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate preview')
    }
  }

  const saveSheet = async () => {
    if (!sheetForm.title.trim()) {
      toast.warning('Sheet title is required')
      return
    }

    setIsSavingSheet(true)
    try {
      await saveOwnerBalanceSheet({
        title: sheetForm.title.trim(),
        pgId: selectedPgId || undefined,
        periodStart: sheetForm.periodStart,
        periodEnd: sheetForm.periodEnd,
        notes: sheetForm.notes.trim() || undefined,
      })
      toast.success('Balance sheet saved')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save balance sheet')
    } finally {
      setIsSavingSheet(false)
    }
  }

  const removeSheet = async (id: string) => {
    try {
      await deleteOwnerBalanceSheet(id)
      toast.success('Balance sheet deleted')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete balance sheet')
    }
  }

  const removeEntry = async (id: string) => {
    try {
      await deleteOwnerLedgerEntry(id)
      toast.success('Entry deleted')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete entry')
    }
  }

  const exportCsv = async (id: string, title: string) => {
    try {
      const blob = await exportOwnerBalanceSheetCsv(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'balance-sheet'}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export CSV')
    }
  }

  const downloadBulkTemplate = () => {
    const blob = new Blob([BULK_UPLOAD_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'balance-sheet-bulk-upload-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">Balance sheet</h2>
          <p className="section-sub">Track income and expenses, then generate snapshots for reports.</p>
        </div>
      </div>

      <div className="panel finance-panel form-grid two-col spaced-top">
        <div className="form-field">
          <label>PG filter</label>
          <select value={selectedPgId} onChange={(event) => setSelectedPgId(event.target.value)}>
            <option value="">All assigned PGs</option>
            {pgs.map((pg) => (
              <option key={pg._id} value={pg._id}>{pg.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Selected context</label>
          <input value={selectedPgName} readOnly />
        </div>
      </div>

      <div className="panel finance-panel form-grid two-col spaced-top">
        <h3 className="finance-title span-all">Add individual entry</h3>
        <div className="form-field">
          <label>Entry type</label>
          <select value={entryForm.entryType} onChange={(event) => setEntryForm((c) => ({ ...c, entryType: event.target.value as 'income' | 'expense' }))}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div className="form-field">
          <label>Category</label>
          <input value={entryForm.category} onChange={(event) => setEntryForm((c) => ({ ...c, category: event.target.value }))} placeholder="Rent, Electricity, Maintenance..." />
        </div>
        <div className="form-field">
          <label>Amount</label>
          <input type="number" value={entryForm.amount === 0 ? '' : String(entryForm.amount)} onChange={(event) => setEntryForm((c) => ({ ...c, amount: Number(event.target.value) || 0 }))} />
        </div>
        <div className="form-field">
          <label>Date</label>
          <input type="date" value={entryForm.entryDate} onChange={(event) => setEntryForm((c) => ({ ...c, entryDate: event.target.value }))} />
        </div>
        <div className="form-field">
          <label>Resident / payer name (optional)</label>
          <input value={entryForm.residentName} onChange={(event) => setEntryForm((c) => ({ ...c, residentName: event.target.value }))} />
        </div>
        <div className="form-field">
          <label>Notes (optional)</label>
          <input value={entryForm.notes} onChange={(event) => setEntryForm((c) => ({ ...c, notes: event.target.value }))} />
        </div>
        <div className="table-action-row span-all">
          <button type="button" className="btn btn-brand" onClick={addEntry} disabled={isSavingEntry}>{isSavingEntry ? 'Saving...' : 'Add entry'}</button>
        </div>
      </div>

      <div className="panel finance-panel spaced-top">
        <h3 className="finance-title">Bulk entries</h3>
        <p className="section-sub">One line each: residentName,amount,YYYY-MM-DD,category,entryType,notes</p>
        <p className="finance-helper">Example: John,9000,2026-10-01,Rent,income,October rent</p>
        <div className="table-action-row" style={{ marginBottom: '8px' }}>
          <button type="button" className="btn btn-line" onClick={downloadBulkTemplate}>Download sample CSV template</button>
        </div>
        <textarea rows={6} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder="John,9000,2026-10-01,Rent,income,October rent" />
        <div className="table-action-row spaced-top">
          <button type="button" className="btn btn-line" onClick={addBulkEntries} disabled={isSavingBulk}>{isSavingBulk ? 'Importing...' : 'Import bulk entries'}</button>
        </div>
      </div>

      <div className="panel finance-panel form-grid two-col spaced-top">
        <h3 className="finance-title span-all">Generate and save balance sheet</h3>
        <div className="form-field">
          <label>Sheet title</label>
          <input value={sheetForm.title} onChange={(event) => setSheetForm((c) => ({ ...c, title: event.target.value }))} />
        </div>
        <div className="form-field">
          <label>Notes</label>
          <input value={sheetForm.notes} onChange={(event) => setSheetForm((c) => ({ ...c, notes: event.target.value }))} />
        </div>
        <div className="form-field">
          <label>Period start</label>
          <input type="date" value={sheetForm.periodStart} onChange={(event) => setSheetForm((c) => ({ ...c, periodStart: event.target.value }))} />
        </div>
        <div className="form-field">
          <label>Period end</label>
          <input type="date" value={sheetForm.periodEnd} onChange={(event) => setSheetForm((c) => ({ ...c, periodEnd: event.target.value }))} />
        </div>
        <div className="table-action-row span-all">
          <button type="button" className="btn btn-line" onClick={createPreview}>Generate preview</button>
          <button type="button" className="btn btn-brand" onClick={saveSheet} disabled={isSavingSheet}>{isSavingSheet ? 'Saving...' : 'Save balance sheet'}</button>
        </div>
      </div>

      {preview ? (
        <div className="panel finance-panel spaced-top">
          <h3 className="finance-title">Preview</h3>
          <div className="finance-kpi-grid">
            <article className="finance-kpi">
              <span>Total income</span>
              <strong>{inr(preview.totalIncome)}</strong>
            </article>
            <article className="finance-kpi">
              <span>Total expense</span>
              <strong>{inr(preview.totalExpense)}</strong>
            </article>
            <article className="finance-kpi">
              <span>Net balance</span>
              <strong>{inr(preview.netBalance)}</strong>
            </article>
            <article className="finance-kpi">
              <span>Entries considered</span>
              <strong>{preview.entriesCount}</strong>
            </article>
          </div>
        </div>
      ) : null}

      <h3 className="spaced-top finance-title">Saved balance sheets</h3>
      <AppTable headers={['Title', 'PG', 'Income', 'Expense', 'Net', 'Created', 'Last generated', 'Updated', 'Actions']}>
        {sheets.length === 0 ? (
          <tr><td colSpan={9} className="empty-table-cell"><EmptyTableState /></td></tr>
        ) : (
          sheets.map((sheet) => (
            <tr key={sheet._id}>
              <td>{sheet.title}</td>
              <td>{typeof sheet.pgId === 'string' ? sheet.pgId : sheet.pgId?.name ?? 'All PGs'}</td>
              <td>{inr(sheet.totalIncome)}</td>
              <td>{inr(sheet.totalExpense)}</td>
              <td>{inr(sheet.netBalance)}</td>
              <td>{formatDateTime(sheet.createdAt)}</td>
              <td>{formatDateTime(sheet.lastGeneratedAt)}</td>
              <td>{formatDateTime(sheet.updatedAt)}</td>
              <td>
                <div className="table-action-row">
                  <button type="button" className="btn btn-line" onClick={() => exportCsv(sheet._id, sheet.title)}>Export CSV</button>
                  <button type="button" className="btn btn-line" onClick={() => removeSheet(sheet._id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))
        )}
      </AppTable>

      <h3 className="spaced-top finance-title">Ledger entries</h3>
      <AppTable headers={['Date', 'Type', 'Category', 'Amount', 'Resident', 'Notes', 'Created', 'Actions']}>
        {entries.length === 0 ? (
          <tr><td colSpan={8} className="empty-table-cell"><EmptyTableState /></td></tr>
        ) : (
          entries.map((entry) => (
            <tr key={entry._id}>
              <td>{new Date(entry.entryDate).toLocaleDateString()}</td>
              <td><span className={`finance-chip ${entry.entryType}`}>{entry.entryType}</span></td>
              <td>{entry.category}</td>
              <td>{inr(entry.amount)}</td>
              <td>{entry.residentName || '-'}</td>
              <td>{entry.notes || '-'}</td>
              <td>{formatDateTime(entry.createdAt)}</td>
              <td>
                <button type="button" className="btn btn-line" onClick={() => removeEntry(entry._id)}>Delete</button>
              </td>
            </tr>
          ))
        )}
      </AppTable>
    </div>
  )
}

export function AdminBalanceSheetPage() {
  const toast = useToast()
  const [sheets, setSheets] = useState<AdminBalanceSheet[]>([])
  const [entries, setEntries] = useState<AdminLedgerEntry[]>([])

  const load = () => {
    Promise.all([getAdminBalanceSheets({ limit: 200 }), getAdminLedgerEntries({ limit: 200 })])
      .then(([sheetData, entryData]) => {
        setSheets(sheetData.items)
        setEntries(entryData.items)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load balance sheet reports'))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">Balance sheets (super admin)</h2>
          <p className="section-sub">Read-only finance visibility across owners and properties.</p>
        </div>
      </div>

      <AppTable headers={['Owner', 'PG', 'Title', 'Income', 'Expense', 'Net', 'Created', 'Last generated', 'Updated']}>
        {sheets.length === 0 ? (
          <tr><td colSpan={9} className="empty-table-cell"><EmptyTableState /></td></tr>
        ) : (
          sheets.map((sheet) => (
            <tr key={sheet._id}>
              <td>{typeof sheet.ownerId === 'string' ? sheet.ownerId : sheet.ownerId?.name ?? '-'}</td>
              <td>{typeof sheet.pgId === 'string' ? sheet.pgId : sheet.pgId?.name ?? 'All PGs'}</td>
              <td>{sheet.title}</td>
              <td>{inr(sheet.totalIncome)}</td>
              <td>{inr(sheet.totalExpense)}</td>
              <td>{inr(sheet.netBalance)}</td>
              <td>{formatDateTime(sheet.createdAt)}</td>
              <td>{formatDateTime(sheet.lastGeneratedAt)}</td>
              <td>{formatDateTime(sheet.updatedAt)}</td>
            </tr>
          ))
        )}
      </AppTable>

      <h3 className="spaced-top finance-title">Recent ledger entries</h3>
      <AppTable headers={['Owner', 'PG', 'Date', 'Type', 'Category', 'Amount', 'Source', 'Created']}>
        {entries.length === 0 ? (
          <tr><td colSpan={8} className="empty-table-cell"><EmptyTableState /></td></tr>
        ) : (
          entries.map((entry) => (
            <tr key={entry._id}>
              <td>{typeof entry.ownerId === 'string' ? entry.ownerId : entry.ownerId?.name ?? '-'}</td>
              <td>{typeof entry.pgId === 'string' ? entry.pgId : entry.pgId?.name ?? '-'}</td>
              <td>{new Date(entry.entryDate).toLocaleDateString()}</td>
              <td><span className={`finance-chip ${entry.entryType}`}>{entry.entryType}</span></td>
              <td>{entry.category}</td>
              <td>{inr(entry.amount)}</td>
              <td>{entry.source ?? '-'}</td>
              <td>{formatDateTime(entry.createdAt)}</td>
            </tr>
          ))
        )}
      </AppTable>
    </div>
  )
}
