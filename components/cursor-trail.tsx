"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface CursorTrailPoint {
  id: string
  x: number
  y: number
  timestamp: number
  color: string
}

interface CursorTrailProps {
  userId: string
  color: string
  className?: string
}

export function CursorTrail({ userId, color, className }: CursorTrailProps) {
  const [trailPoints, setTrailPoints] = useState<CursorTrailPoint[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newPoint: CursorTrailPoint = {
        id: `${userId}-${Date.now()}`,
        x,
        y,
        timestamp: Date.now(),
        color,
      }

      setTrailPoints((prev) => {
        const filtered = prev.filter((point) => Date.now() - point.timestamp < 1000)
        return [...filtered, newPoint].slice(-10) // Keep last 10 points
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => document.removeEventListener("mousemove", handleMouseMove)
  }, [userId, color])

  useEffect(() => {
    const interval = setInterval(() => {
      setTrailPoints((prev) => prev.filter((point) => Date.now() - point.timestamp < 1000))
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`}>
      <AnimatePresence>
        {trailPoints.map((point, index) => (
          <motion.div
            key={point.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: point.color,
              left: point.x - 4,
              top: point.y - 4,
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{
              scale: 1 - index * 0.1,
              opacity: 0.8 - index * 0.08,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
