import app from '../src/app'
import { connectDb } from '../src/db/mongoose'

type ServerlessRequest = Parameters<typeof app>[0]
type ServerlessResponse = Parameters<typeof app>[1]

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  await connectDb()
  return app(req, res)
}