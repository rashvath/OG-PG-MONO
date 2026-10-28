"use client"

interface AnimatedCircularProgressBarProps {
  value: number
  gaugePrimaryColor: string
  gaugeSecondaryColor: string
}

export function AnimatedCircularProgressBar({
  value,
  gaugePrimaryColor,
  gaugeSecondaryColor,
}: AnimatedCircularProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 44
  const stroke = 10
  const norm = 2 * Math.PI * radius
  const dash = norm - (clamped / 100) * norm

  return (
    <div className="progress-wrap" role="img" aria-label={`Progress ${clamped}%`}>
      <svg width="120" height="120" viewBox="0 0 120 120" className="progress-ring">
        <circle cx="60" cy="60" r={radius} fill="transparent" stroke={gaugeSecondaryColor} strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="transparent"
          stroke={gaugePrimaryColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={norm}
          strokeDashoffset={dash}
          transform="rotate(-90 60 60)"
          className="progress-bar"
        />
      </svg>
      <span className="progress-text">{clamped}%</span>
    </div>
  )
}
