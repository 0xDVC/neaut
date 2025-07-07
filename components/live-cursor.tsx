"use client"

import * as React from "react"
import type { CursorPosition } from "../types/distributed"

interface LiveCursorProps {
  cursor: CursorPosition
  containerRef: React.RefObject<HTMLElement>
}

export function LiveCursor({ cursor, containerRef }: LiveCursorProps) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (!containerRef.current) return

    const updatePosition = () => {
      const container = containerRef.current!
      const rect = container.getBoundingClientRect()

      // Simple position calculation - in production you'd use proper text measurement
      const lineHeight = 24
      const charWidth = 8
      const lines = Math.floor(cursor.position / 50) // Approximate characters per line
      const chars = cursor.position % 50

      const x = chars * charWidth
      const y = lines * lineHeight

      setPosition({ x, y })
      setIsVisible(true)

      // Hide cursor after 3 seconds of inactivity
      const timeout = setTimeout(() => setIsVisible(false), 3000)
      return () => clearTimeout(timeout)
    }

    updatePosition()
  }, [cursor.position, containerRef])

  if (!isVisible) return null

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-1px)",
      }}
    >
      {/* Cursor line */}
      <div className="w-0.5 h-5 animate-pulse" style={{ backgroundColor: cursor.color }} />

      {/* User label */}
      <div
        className="absolute -top-7 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-lg"
        style={{
          backgroundColor: cursor.color,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {cursor.userName}
      </div>

      {/* Selection highlight */}
      {cursor.selection && cursor.selection.start !== cursor.selection.end && (
        <div
          className="absolute opacity-20 rounded"
          style={{
            backgroundColor: cursor.color,
            left: 0,
            top: 0,
            width: `${(cursor.selection.end - cursor.selection.start) * 8}px`,
            height: "20px",
          }}
        />
      )}
    </div>
  )
}
