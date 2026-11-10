import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import adminRoutes from './routes/admin.routes'
import authRoutes from './routes/auth.routes'
import emailRoutes from './routes/email.routes'
import employeeRoutes from './routes/employee.routes'
import formConfigRoutes from './routes/form-config.routes'
import listingsRoutes from './routes/listings.routes'
import ownerInventoryRoutes from './routes/owner-inventory.routes'
import ownerRoutes from './routes/owner.routes'
import uploadsRoutes from './routes/uploads.routes'

const app: Express = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/listings', listingsRoutes)
app.use('/api/v1/email', emailRoutes)
app.use('/api/v1/form-configs', formConfigRoutes)
app.use('/api/v1/owner', ownerInventoryRoutes)
app.use('/api/v1/owner', employeeRoutes)
app.use('/api/v1/owner', ownerRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/uploads', uploadsRoutes)

export default app
