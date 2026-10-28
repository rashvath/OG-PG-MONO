import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

import { env } from '../config/env'
import { auth } from '../middleware/auth'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'))
      return
    }
    cb(null, true)
  },
})

function ensureCloudinaryConfigured() {
  if (!env.cloudinaryUrl) {
    throw new Error('CLOUDINARY_URL is not configured')
  }

  cloudinary.config({
    cloudinary_url: env.cloudinaryUrl,
    secure: true,
  })
}

function uploadToCloudinary(buffer: Buffer, folder: string) {
  return new Promise<{
    secure_url: string
    public_id: string
    width?: number
    height?: number
    bytes?: number
    format?: string
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Upload failed'))
          return
        }
        resolve(result)
      },
    )

    stream.end(buffer)
  })
}

router.post('/images', auth(), upload.array('images', 5), async (req, res) => {
  try {
    ensureCloudinaryConfigured()

    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (files.length === 0) {
      res.status(400).json({ message: 'No images were uploaded' })
      return
    }

    const folder = 'og-pg'

    const uploaded = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer, folder)),
    )

    res.status(201).json({
      items: uploaded.map((item) => ({
        url: item.secure_url,
        publicId: item.public_id,
        width: item.width ?? null,
        height: item.height ?? null,
        bytes: item.bytes ?? null,
        format: item.format ?? null,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image upload failed'
    res.status(500).json({ message })
  }
})

export default router
