import { useEffect, useRef, useState } from 'react'
import { FilePlus2 } from 'lucide-react'

import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { createOwnerDocument, deleteOwnerDocument, getOwnerDocuments, getOwnerPgs, type OwnerDocument, type OwnerPg } from '@/api/owner-api'
import { uploadPgImages } from '@/api/upload-api'
import { useFormConfig } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

export function OwnerDocumentsPage() {
  const toast = useToast()
  const { isRequired, getLabel } = useFormConfig('owner.documents')

  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [docs, setDocs] = useState<OwnerDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (isRequired('pgId') && !form.pgId) {
      toast.warning('Please select a PG')
      return
    }
    if (isRequired('title') && !form.title.trim()) {
      toast.warning('Document title is required')
      return
    }
    if (isRequired('imageUrl') && !form.imageUrl.trim()) {
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
      if (fileInputRef.current) fileInputRef.current.value = ''
      setIsUploadDialogOpen(false)
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

  const closeUploadDialog = () => {
    if (!isSaving && !isUploading) setIsUploadDialogOpen(false)
  }

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">PG Document Locker</h2>
          <p className="section-sub">Simple upload: choose PG, add document name, upload image, and view it below.</p>
        </div>
        <Button leftIcon={<FilePlus2 size={16} aria-hidden="true" />} onClick={() => setIsUploadDialogOpen(true)} disabled={!pgs.length || isLoading}>
          Upload document
        </Button>
      </div>

      <AppDialog
        open={isUploadDialogOpen}
        title="Upload document"
        subtitle="Choose a PG, name the document, and upload an image."
        onClose={closeUploadDialog}
        footer={(
          <>
            <Button variant="secondary" onClick={closeUploadDialog} disabled={isSaving || isUploading}>Cancel</Button>
            <Button type="submit" form="owner-document-form" loading={isSaving} disabled={isUploading}>Save document</Button>
          </>
        )}
      >
        <form id="owner-document-form" className="form-grid two-col" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <div className="form-field">
            <label>
              {getLabel('pgId', 'PG')}
              {isRequired('pgId') ? <span className="required-mark"> *</span> : null}
            </label>
            <CustomDropdown
              ariaLabel="Select PG"
              value={form.pgId}
              onChange={(nextValue) => setForm((current) => ({ ...current, pgId: nextValue }))}
              options={[
                { label: 'Select PG', value: '' },
                ...pgs.map((pg) => ({ label: pg.name, value: pg._id })),
              ]}
              searchable
              minSearchOptions={6}
            />
          </div>

          <div className="form-field">
            <label>
              {getLabel('title', 'Document name')}
              {isRequired('title') ? <span className="required-mark"> *</span> : null}
            </label>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="PG Trade License" />
          </div>

          <div className="form-field span-all">
            <label>
              {getLabel('imageUrl', 'Document image')}
              {isRequired('imageUrl') ? <span className="required-mark"> *</span> : null}
            </label>
            <div className="image-upload-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                disabled={isUploading || isSaving}
              />
              <Button type="button" variant="secondary" onClick={() => void uploadImage()} disabled={!selectedFile || isUploading || isSaving} loading={isUploading}>
                Upload image
              </Button>
            </div>
            {form.imageUrl ? <small className="section-sub">Image uploaded successfully.</small> : null}
          </div>

          {form.imageUrl ? (
            <div className="owner-doc-preview span-all">
              <img src={form.imageUrl} alt="Uploaded document preview" />
            </div>
          ) : null}
        </form>
      </AppDialog>

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
