"use client"

import { useEffect, useState } from 'react'

import { AnimatedCircularProgressBar } from '@/registry/magicui/animated-circular-progress-bar'

export function AnimatedCircularProgressBarDemo() {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const handleIncrement = (prev: number) => {
      if (prev === 100) {
        return 0
      }
      return prev + 10
    }
    setValue(handleIncrement)
    const interval = setInterval(() => setValue(handleIncrement), 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatedCircularProgressBar
      value={value}
      gaugePrimaryColor="#0D6EFD"
      gaugeSecondaryColor="#E6F2FF"
    />
  )
}
