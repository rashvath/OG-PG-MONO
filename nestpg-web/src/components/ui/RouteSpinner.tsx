import { CircularLoader } from '@/components/ui/CircularLoader'

interface RouteSpinnerProps {
  label?: string
}

export function RouteSpinner({ label = 'Loading page...' }: RouteSpinnerProps) {
  return (
    <div className="route-loader-shell">
      <CircularLoader label={label} />
    </div>
  )
}
