import { useRef } from 'react'
import type { ClipboardEvent } from 'react'

type OtpInputProps = {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  label?: string
}

export function OtpInput({ length = 4, value, onChange, disabled = false, error, label }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  const updateDigit = (index: number, digit: string) => {
    const next = [...digits]
    next[index] = digit.replace(/\D/g, '').slice(-1)
    onChange(next.join(''))
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const next = Array.from({ length }, (_, index) => pastedDigits[index] ?? '')
    onChange(next.join(''))
    inputRefs.current[Math.max(pastedDigits.length - 1, 0)]?.focus()
  }

  return (
    <div className="otp-field">
      {label ? <label className="otp-label">{label}</label> : null}
      <div className="otp-box-row">
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            pattern="[0-9]"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            className={`otp-input${error ? ' has-error' : ''}`}
            aria-label={`OTP digit ${index + 1} of ${length}`}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            value={digits[index]}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus()
              }
            }}
            onKeyUp={(event) => {
              if (/^\d$/.test(event.currentTarget.value) && index < length - 1) {
                inputRefs.current[index + 1]?.focus()
              }
            }}
            onPaste={index === 0 ? handlePaste : undefined}
          />
        ))}
      </div>
      {error ? <p className="otp-error" role="alert">{error}</p> : null}
    </div>
  )
}
