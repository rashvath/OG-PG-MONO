import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

type MorphingTextProps = {
  texts: string[]
  className?: string
  intervalMs?: number
  transitionMs?: number
}

export function MorphingText({
  texts,
  className,
  intervalMs = 1700,
  transitionMs = 260,
}: MorphingTextProps) {
  const safeTexts = useMemo(() => (texts.length > 0 ? texts : ['']), [texts])
  const [index, setIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const cycle = setInterval(() => {
      setIsVisible(false)
      timeoutId = setTimeout(() => {
        setIndex((current) => (current + 1) % safeTexts.length)
        setIsVisible(true)
      }, transitionMs)
    }, intervalMs)

    return () => {
      clearInterval(cycle)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [intervalMs, transitionMs, safeTexts.length])

  return (
    <span
      className={cn(
        'morphing-text',
        isVisible ? 'morphing-text-in' : 'morphing-text-out',
        className,
      )}
      aria-live="polite"
    >
      {safeTexts[index]}
    </span>
  )
}
