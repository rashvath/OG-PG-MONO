import mongoose from 'mongoose'

import { env } from '../config/env'

let connectionPromise: Promise<typeof mongoose> | null = null

export async function connectDb() {
  if (mongoose.connection.readyState === 1) {
    return
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri).catch((error) => {
      connectionPromise = null
      throw error
    })
  }

  await connectionPromise
}
