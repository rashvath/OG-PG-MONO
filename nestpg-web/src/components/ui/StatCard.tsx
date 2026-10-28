import { NumberTicker } from '@/registry/magicui/number-ticker'

interface StatCardProps {
  label: string
  value: string | number
  variant: 'indigo' | 'orange' | 'teal' | 'amber'
}

export function StatCard({ label, value, variant }: StatCardProps) {
  const raw = typeof value === 'number' ? String(value) : value
  const matched = raw.match(/^(-?\d+(?:\.\d+)?)(.*)$/)

  return (
    <div className={`stat-card stat-${variant}`}>
      <strong>
        {matched ? (
          <NumberTicker value={Number(matched[1])} suffix={matched[2] ?? ''} className="number-ticker" />
        ) : (
          value
        )}
      </strong>
      <span>{label}</span>
    </div>
  )
}
