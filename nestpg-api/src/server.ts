import app from './app'
import { env } from './config/env'
import { connectDb } from './db/mongoose'

async function start() {
  await connectDb()
  app.listen(env.port, () => {
    console.log(`NestPG API listening on port ${env.port}`)
  })
}

start().catch((error) => {
  console.error('Failed to start API', error)
  process.exit(1)
})
