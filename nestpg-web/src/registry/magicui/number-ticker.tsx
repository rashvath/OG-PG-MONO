import { useEffect, useMemo, useState } from 'react'

type NumberTickerProps = {
  value: number
  className?: string
  durationMs?: number
  prefix?: string
  suffix?: string
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  className,
  durationMs = 900,
  prefix = '',
  suffix = '',
  decimalPlaces,
}: NumberTickerProps) {
  const places = useMemo(
    () => (decimalPlaces ?? (Number.isInteger(value) ? 0 : 1)),
    [decimalPlaces, value],
  )
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const from = 0
    const to = value

    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + (to - from) * eased
      setDisplayValue(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return <span className={className}>{`${prefix}${displayValue.toFixed(places)}${suffix}`}</span>
}
