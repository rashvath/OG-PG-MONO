import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/Input'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  hint?: ReactNode
  error?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  type?: 'password' | 'text'
}

export function PasswordInput({ label, hint, error, inputRef, type = 'text', ...props }: PasswordInputProps) {
  const [showValue, setShowValue] = useState(false)

  return (
    <Input
      {...props}
      inputRef={inputRef}
      label={label}
      hint={hint}
      error={error}
      type={showValue ? type : 'password'}
      rightElement={
        <button
          type="button"
          aria-label={showValue ? 'Hide' : 'Show'}
          aria-pressed={showValue}
          onClick={() => setShowValue((visible) => !visible)}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xs text-text-2 hover:text-text focus-visible:outline-2 focus-visible:outline-[var(--c-focus)]"
        >
          {showValue ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  )
}
