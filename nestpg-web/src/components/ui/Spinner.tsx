import { cn } from '@/helpers/utils'

type SpinnerProps = {
  size?: number
  className?: string
  label?: string
}

export function Spinner({ size = 16, className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      role="status"
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}
