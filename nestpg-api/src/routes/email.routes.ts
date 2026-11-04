import { Router } from 'express'
import { z } from 'zod'

import { env } from '../config/env'
import { sendEmailReusable } from '../shared/email/send-email-reusable'

const router: Router = Router()

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1),
  text: z.string().trim().min(1),
  html: z.string().optional(),
  replyTo: z.string().email().optional(),
  from: z.string().optional(),
})

router.post('/send', async (req, res) => {
  const parsed = sendEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (!env.gmailUser || !env.gmailAppPassword) {
    res.status(500).json({
      message: 'Email config missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in env.',
    })
    return
  }

  const result = await sendEmailReusable({
    to: parsed.data.to,
    subject: parsed.data.subject,
    text: parsed.data.text,
    ...(parsed.data.html ? { html: parsed.data.html } : {}),
    ...(parsed.data.replyTo ? { replyTo: parsed.data.replyTo } : {}),
    ...(parsed.data.from ? { from: parsed.data.from } : {}),
  }, {
    user: env.gmailUser,
    appPassword: env.gmailAppPassword,
    ...(env.gmailFrom ? { from: env.gmailFrom } : {}),
  })

  if (!result.ok) {
    res.status(502).json({ ok: false, message: result.error })
    return
  }

  res.json({ ok: true })
})

export default router
