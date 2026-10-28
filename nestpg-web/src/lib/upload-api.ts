const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

type ImageNormalizationOptions = {
  width: number
  height: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/webp'
}

type UploadImageOptions = {
  normalize?: ImageNormalizationOptions
}

function getToken() {
  return localStorage.getItem('nestpg-token')
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Unable to read image: ${file.name}`))
    }
    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image conversion failed.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

async function normalizeImageFile(file: File, options: ImageNormalizationOptions) {
  const image = await loadImageElement(file)
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image processing is not supported in this browser.')
  }

  const sourceRatio = image.width / image.height
  const targetRatio = options.width / options.height

  let sourceWidth = image.width
  let sourceHeight = image.height
  let sourceX = 0
  let sourceY = 0

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio
    sourceX = (image.width - sourceWidth) / 2
  } else {
    sourceHeight = image.width / targetRatio
    sourceY = (image.height - sourceHeight) / 2
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, options.width, options.height)
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, options.width, options.height)

  const mimeType = options.mimeType ?? 'image/jpeg'
  const quality = options.quality ?? 0.9
  const blob = await canvasToBlob(canvas, mimeType, quality)
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'image'

  return new File([blob], `${normalizedName}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  })
}

async function normalizeImageFiles(files: File[], options?: ImageNormalizationOptions) {
  if (!options) {
    return files
  }

  const normalized = await Promise.all(files.map((file) => normalizeImageFile(file, options)))
  return normalized
}

export async function uploadPgImages(files: File[], options?: UploadImageOptions) {
  if (files.length === 0) {
    return [] as string[]
  }

  const filesToUpload = await normalizeImageFiles(files, options?.normalize)

  const formData = new FormData()
  for (const file of filesToUpload) {
    formData.append('images', file)
  }

  const token = getToken()
  const response = await fetch(`${API_BASE_URL}/uploads/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  const data = (await response.json()) as {
    items?: Array<{ url: string }>
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message ?? 'Failed to upload images')
  }

  return (data.items ?? []).map((item) => item.url).filter(Boolean)
}
