import nodemailer, { type Transporter } from 'nodemailer'

export type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  from?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export type SendEmailConfig = {
  user: string
  appPassword: string
  from?: string
}

let cachedTransport: Transporter | null = null

function getTransport(config: SendEmailConfig): Transporter {
  if (cachedTransport) {
    return cachedTransport
  }

  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
  })

  return cachedTransport
}

export async function sendEmailReusable(
  input: SendEmailInput,
  config: SendEmailConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transporter = getTransport(config)

    await transporter.sendMail({
      from: (input.from || config.from || config.user).trim(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || input.text,
      replyTo: input.replyTo,
      attachments: input.attachments,
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
