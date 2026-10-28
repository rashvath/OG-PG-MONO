type CalendarProps = {
  mode?: 'single'
  selected?: Date
  className?: string
}

export function Calendar({ selected, className }: CalendarProps) {
  const date = selected ?? new Date()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  const day = date.getDate()

  return (
    <div className={`calendar-mini ${className ?? ''}`.trim()}>
      <p className="calendar-mini-head">{`${month} ${year}`}</p>
      <div className="calendar-mini-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
          <span key={label} className="calendar-mini-weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="calendar-mini-grid">
        {Array.from({ length: 31 }, (_, index) => index + 1).map((value) => (
          <span key={value} className={`calendar-mini-day ${value === day ? 'active' : ''}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}
