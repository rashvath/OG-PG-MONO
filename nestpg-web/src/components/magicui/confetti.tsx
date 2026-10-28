"use client"

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

export interface ConfettiRef {
  fire: () => void
}

interface ConfettiProps {
  className?: string
  onMouseEnter?: () => void
}

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(function Confetti(
  { className, onMouseEnter },
  ref,
) {
  const [burst, setBurst] = useState(0)

  useImperativeHandle(ref, () => ({
    fire: () => setBurst((current) => current + 1),
  }))

  const particles = useMemo<number[]>(() => {
    const total = 36
    return Array.from({ length: total }).map((_, index) => burst * 1000 + index)
  }, [burst])

  return (
    <div className={`${className ?? ''} confetti-burst-${burst}`} onMouseEnter={onMouseEnter}>
      {particles.map((id, index) => (
        <span key={id} className={`confetti-piece ${index % 2 === 0 ? 'drift-left' : 'drift-right'}`} />
      ))}
    </div>
  )
})
