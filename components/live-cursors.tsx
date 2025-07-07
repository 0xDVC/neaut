"use client"

import * as React from "react"
import type { CursorPosition } from "../types/distributed"
import type { JSX } from "react" 

interface LiveCursorsProps {
  cursors: CursorPosition[]
  content: string
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function LiveCursors({ cursors, content, textareaRef }: LiveCursorsProps) {
  const [cursorElements, setCursorElements] = React.useState<JSX.Element[]>([])

  React.useEffect(() => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const computedStyle = window.getComputedStyle(textarea)
    const lineHeight = Number.parseInt(computedStyle.lineHeight)
    const fontSize = Number.parseInt(computedStyle.fontSize)
    const paddingLeft = Number.parseInt(computedStyle.paddingLeft)
    const paddingTop = Number.parseInt(computedStyle.paddingTop)

    const getTextPosition = (position: number) => {
      const textBeforeCursor = content.substring(0, position)
      const lines = textBeforeCursor.split("\n")
      const lineNumber = lines.length - 1
      const columnNumber = lines[lines.length - 1].length

      // Approximate character width (this is a simplification)
      const charWidth = fontSize * 0.6

      return {
        x: paddingLeft + columnNumber * charWidth,
        y: paddingTop + lineNumber * lineHeight,
      }
    }

    const elements = cursors.map((cursor) => {
      const position = getTextPosition(cursor.position)

      return (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-10"
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
            className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
            style={{
              backgroundColor: cursor.color,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Anonymous
          </div>

          {/* Selection highlight */}
          {cursor.selection && cursor.selection.start !== cursor.selection.end && (
            <div
              className="absolute opacity-30 rounded"
              style={{
                backgroundColor: cursor.color,
                left: 0,
                top: 0,
                width: `${(cursor.selection.end - cursor.selection.start) * fontSize * 0.6}px`,
                height: `${lineHeight}px`,
              }}
            />
          )}
        </div>
      )
    })

    setCursorElements(elements)
  }, [cursors, content, textareaRef])

  return <div className="absolute inset-0 pointer-events-none">{cursorElements}</div>
}
