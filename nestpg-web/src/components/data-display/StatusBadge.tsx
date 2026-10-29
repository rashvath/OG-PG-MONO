interface StatusBadgeProps {
  value: string
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const map: Record<string, string> = {
    live: 'badge-ok',
    verified: 'badge-ok',
    new: 'badge-ok',
    pending: 'badge-warn',
    contacted: 'badge-warn',
    blocked: 'badge-bad',
    rejected: 'badge-bad',
    suspended: 'badge-bad',
    active: 'badge-ok',
  }

  return <span className={`badge ${map[value] ?? 'badge-warn'}`}>{value}</span>
}
