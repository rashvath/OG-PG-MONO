import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/helpers/utils'

type ButtonVariant = 'brand' | 'neutral' | 'secondary' | 'tertiary' | 'danger' | 'primary' | 'ghost'
type ButtonSize = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClasses: Record<Exclude<ButtonVariant, 'primary' | 'ghost'>, string> = {
  brand: 'bg-accent text-[#222]',
  neutral: 'bg-neutral-bg text-neutral-label',
  secondary: 'bg-surface text-text shadow-1 ring-1 ring-border',
  tertiary: 'bg-transparent text-text px-[var(--space-6)] hover:underline',
  danger: 'bg-error text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[var(--space-6)]',
  md: 'px-[var(--space-8)]',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolvedVariant = variant === 'primary' ? 'brand' : variant === 'ghost' ? 'tertiary' : variant
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-control items-center justify-center rounded-xs text-sm font-semibold transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-focus)] disabled:cursor-not-allowed disabled:opacity-60',
        sizeClasses[size],
        variantClasses[resolvedVariant as keyof typeof variantClasses],
        'text-center',
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
      {leftIcon ? <span className="mr-2 inline-flex items-center">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="ml-2 inline-flex items-center">{rightIcon}</span> : null}
    </button>
  )
}
