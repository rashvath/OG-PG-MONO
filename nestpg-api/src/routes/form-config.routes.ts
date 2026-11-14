import { Router } from 'express'

import { listMergedFormConfigs } from '../services/form-config.service'

const router = Router()

router.get('/', async (req, res) => {
  const rawKeys = typeof req.query.keys === 'string' ? req.query.keys : ''
  const formKeys = rawKeys
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const items = await listMergedFormConfigs(formKeys.length > 0 ? formKeys : undefined)
  res.json({ items })
})

export default router
