import { useEffect, useState, type RefObject } from 'react'
import { motion } from 'motion/react'

import { cn } from '@/helpers/utils'

export interface AnimatedBeamProps {
  className?: string
  containerRef: RefObject<HTMLElement | null>
  fromRef: RefObject<HTMLElement | null>
  toRef: RefObject<HTMLElement | null>
  curvature?: number
  reverse?: boolean
  pathColor?: string
  pathWidth?: number
  pathOpacity?: number
  gradientStartColor?: string
  gradientStopColor?: string
  delay?: number
  duration?: number
  repeat?: number
  repeatDelay?: number
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
}

export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 5,
  delay = 0,
  pathColor = '#0D6EFD',
  pathWidth = 2,
  pathOpacity = 0.35,
  repeat = Infinity,
  repeatDelay = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const [pathD, setPathD] = useState('')
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current || !fromRef.current || !toRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const rectA = fromRef.current.getBoundingClientRect()
      const rectB = toRef.current.getBoundingClientRect()

      const svgWidth = containerRect.width
      const svgHeight = containerRect.height
      setSvgDimensions({ width: svgWidth, height: svgHeight })

      const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset

      // Midpoint-based control keeps opposite-direction beams geometrically symmetric.
      const controlY = (startY + endY) / 2 - curvature
      const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`
      setPathD(d)
    }

    const resizeObserver = new ResizeObserver(updatePath)
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    updatePath()

    return () => {
      resizeObserver.disconnect()
    }
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ])

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn('about-beam-svg', className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <path d={pathD} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      <motion.path
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: [0, 1, 0], opacity: [0.4, 0.85, 0.4] }}
        transition={{ delay, duration, ease: [0.16, 1, 0.3, 1], repeat, repeatDelay }}
      />
    </svg>
  )
}
