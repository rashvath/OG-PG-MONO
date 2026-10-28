import { useEffect, useState } from 'react'

import { AnimatedCircularProgressBar } from '@/registry/magicui/animated-circular-progress-bar'

interface CircularLoaderProps {
  label?: string
}

export function CircularLoader({ label = 'Loading graph data...' }: CircularLoaderProps) {
  const [value, setValue] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setValue((prev) => (prev >= 90 ? 30 : prev + 10))
    }, 380)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="chart-loader" role="status" aria-live="polite">
      <AnimatedCircularProgressBar
        value={value}
        gaugePrimaryColor="rgb(201 93 67)"
        gaugeSecondaryColor="rgba(201, 93, 67, 0.18)"
      />
      <p>{label}</p>
    </div>
  )
}
