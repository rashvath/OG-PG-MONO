import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/nestpg',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-env',
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
}
