import { useEffect, useState } from 'react'

import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import { createOwnerDocument, deleteOwnerDocument, getOwnerDocuments, getOwnerPgs, type OwnerDocument, type OwnerPg } from '@/api/owner-api'
import { uploadPgImages } from '@/api/upload-api'
import { useToast } from '@/lib/toast'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

export function OwnerDocumentsPage() {
  const toast = useToast()

  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [docs, setDocs] = useState<OwnerDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    pgId: '',
    title: '',
    imageUrl: '',
  })

  const load = () => {
    setIsLoading(true)
    Promise.all([getOwnerPgs(), getOwnerDocuments({ limit: 200 })])
      .then(([pgData, docData]) => {
        setPgs(pgData.items)
        setDocs(docData.items)

        const firstPgId = pgData.items[0]?._id ?? ''
        if (!form.pgId && firstPgId) {
          setForm((current) => ({ ...current, pgId: firstPgId }))
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load documents'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const uploadImage = async () => {
    if (!selectedFile) {
      toast.warning('Please select an image file first')
      return
    }

    setIsUploading(true)
    try {
      const urls = await uploadPgImages([selectedFile])
      const imageUrl = urls[0]
      if (!imageUrl) {
        toast.error('Upload failed. No URL returned.')
        return
      }

      setForm((current) => ({ ...current, imageUrl }))
      toast.success('Document image uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const submit = async () => {
    if (!form.pgId) {
      toast.warning('Please select a PG')
      return
    }
    if (!form.title.trim()) {
      toast.warning('Document title is required')
      return
    }
    if (!form.imageUrl.trim()) {
      toast.warning('Please upload the document image')
      return
    }

    setIsSaving(true)
    try {
      await createOwnerDocument({
        pgId: form.pgId,
        title: form.title.trim(),
        documentType: 'General',
        imageUrl: form.imageUrl.trim(),
      })
      toast.success('Document saved')
      setForm((current) => ({
        ...current,
        title: '',
        imageUrl: '',
      }))
      setSelectedFile(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save document')
    } finally {
      setIsSaving(false)
    }
  }

  const removeDocument = async (id: string) => {
    try {
      await deleteOwnerDocument(id)
      toast.success('Document deleted')
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete document')
    }
  }

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">PG Document Locker</h2>
          <p className="section-sub">Simple upload: choose PG, add document name, upload image, and view it below.</p>
        </div>
      </div>

      <div className="panel finance-panel form-grid two-col spaced-top">
        <h3 className="finance-title span-all">Upload document</h3>

        <div className="form-field">
          <label>PG</label>
          <select value={form.pgId} onChange={(event) => setForm((current) => ({ ...current, pgId: event.target.value }))}>
            <option value="">Select PG</option>
            {pgs.map((pg) => (
              <option key={pg._id} value={pg._id}>{pg.name}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Document name</label>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="PG Trade License" />
        </div>

        <div className="form-field span-all">
          <label>Document image</label>
          <div className="image-upload-row">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setSelectedFile(file)
              }}
            />
            <button type="button" className="btn btn-line" onClick={uploadImage} disabled={!selectedFile || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload image'}
            </button>
          </div>
          {form.imageUrl ? <small className="section-sub">Image uploaded successfully.</small> : null}
        </div>

        {form.imageUrl ? (
          <div className="owner-doc-preview span-all">
            <img src={form.imageUrl} alt="Uploaded document preview" />
          </div>
        ) : null}

        <div className="table-action-row span-all">
          <button type="button" className="btn btn-brand" onClick={submit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save document'}
          </button>
        </div>
      </div>

      <div className="owner-doc-grid spaced-top">
        {isLoading ? (
          <div className="panel">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="panel"><EmptyTableState /></div>
        ) : (
          docs.map((doc) => (
            <article key={doc._id} className="owner-doc-card">
              <img src={doc.imageUrl} alt={doc.title} />
              <div className="owner-doc-body">
                <h4>{doc.title}</h4>
                <p>
                  <strong>PG:</strong> {typeof doc.pgId === 'string' ? doc.pgId : doc.pgId?.name ?? '-'}
                </p>
                <p>
                  <strong>Saved:</strong> {formatDateTime(doc.createdAt)}
                </p>
                <div className="table-action-row">
                  <a className="btn btn-line" href={doc.imageUrl} target="_blank" rel="noreferrer">View image</a>
                  <button type="button" className="btn btn-line" onClick={() => removeDocument(doc._id)}>Delete</button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
