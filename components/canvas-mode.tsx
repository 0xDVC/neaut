"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Palette, Type, Eraser } from "lucide-react"

interface CanvasModeProps {
  onExitCanvas: () => void
}

export function CanvasMode({ onExitCanvas }: CanvasModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen")
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Set drawing properties
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineWidth = brushSize
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button onClick={onExitCanvas} variant="outline" size="sm">
            Exit Canvas
          </Button>
          <Separator orientation="vertical" className="h-6" />

          {/* Tools */}
          <div className="flex items-center gap-1">
            <Button variant={tool === "pen" ? "default" : "ghost"} size="sm" onClick={() => setTool("pen")}>
              <Palette className="h-4 w-4" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "ghost"} size="sm" onClick={() => setTool("eraser")}>
              <Eraser className="h-4 w-4" />
            </Button>
            <Button variant={tool === "text" ? "default" : "ghost"} size="sm" onClick={() => setTool("text")}>
              <Type className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Color picker */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded border"
          />

          {/* Brush size */}
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <Button onClick={clearCanvas} variant="outline" size="sm">
          Clear
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  )
}
