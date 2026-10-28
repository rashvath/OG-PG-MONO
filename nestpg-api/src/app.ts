import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import adminRoutes from './routes/admin.routes'
import authRoutes from './routes/auth.routes'
import listingsRoutes from './routes/listings.routes'
import ownerRoutes from './routes/owner.routes'
import uploadsRoutes from './routes/uploads.routes'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/listings', listingsRoutes)
app.use('/api/v1/owner', ownerRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/uploads', uploadsRoutes)

export default app
