"use client"

import * as React from "react"
import { Bold, Italic, List, ListOrdered, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageUploadModal } from "./upload/image-upload-modal"
import { useState } from "react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onCursorChange?: () => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  onCursorChange,
  placeholder = "Start writing...",
  className,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showToolbar, setShowToolbar] = React.useState(false)
  const [toolbarPosition, setToolbarPosition] = React.useState({ x: 0, y: 0 })
  const [showUploadModal, setShowUploadModal] = useState(false)

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      onChange(newContent)
      onCursorChange?.()
    }
  }

  const handleKeyUp = () => {
    onCursorChange?.()
  }

  const handleMouseUp = () => {
    onCursorChange?.()
    // Don't show toolbar on selection anymore
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle native OS shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault()
          execCommand("bold")
          break
        case "i":
          e.preventDefault()
          execCommand("italic")
          break
        case "u":
          e.preventDefault()
          execCommand("underline")
          break
        case "z":
          if (e.shiftKey) {
            e.preventDefault()
            execCommand("redo")
          } else {
            e.preventDefault()
            execCommand("undo")
          }
          break
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    // Only show toolbar if there's content or if we're right-clicking on text
    const hasContent = editorRef.current && editorRef.current.textContent?.trim()
    if (!hasContent) return

    const rect = editorRef.current!.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const clickY = e.clientY

    // Calculate if we should show above or below
    const spaceAbove = clickY - rect.top
    const spaceBelow = rect.bottom - clickY
    const toolbarHeight = 50 // Approximate toolbar height

    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    // Position above if there's more space above or if we're in bottom half of viewport
    if (spaceAbove > toolbarHeight && (spaceAbove > spaceBelow || clickY > viewportHeight * 0.6)) {
      y = y - toolbarHeight - 10 // 10px gap
    } else {
      y = y + 10 // 10px gap below
    }

    // Keep toolbar within editor bounds horizontally
    const toolbarWidth = 200 // Approximate toolbar width
    const maxX = rect.width - toolbarWidth
    x = Math.max(10, Math.min(x - toolbarWidth / 2, maxX))

    setToolbarPosition({ x, y })
    setShowToolbar(true)
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Hide toolbar when clicking outside, but not immediately on toolbar buttons
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setTimeout(() => {
        setShowToolbar(false)
      }, 150)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
    // Keep toolbar visible after command
    setTimeout(() => {}, 10)
  }

  const handleImageUpload = () => {
    setShowUploadModal(true)
  }

  const insertImageFromUpload = (imageUrl: string, fileName: string) => {
    const img = `<img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />`
    document.execCommand("insertHTML", false, img)
    handleInput()
    setShowUploadModal(false)
  }

  const isCommandActive = (command: string) => {
    return document.queryCommandState(command)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Floating toolbar - only shows on selection or right-click */}
      {showToolbar && (
        <div
          className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1.5"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
          }}
        >
          <div className="flex items-center gap-0.5">
            <Button
              variant={isCommandActive("bold") ? "default" : "ghost"}
              size="sm"
              onClick={() => execCommand("bold")}
              className="h-7 w-7 p-0"
              title="Bold (⌘B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant={isCommandActive("italic") ? "default" : "ghost"}
              size="sm"
              onClick={() => execCommand("italic")}
              className="h-7 w-7 p-0"
              title="Italic (⌘I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-4 bg-border/50 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => execCommand("insertUnorderedList")}
              className="h-7 w-7 p-0"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => execCommand("insertOrderedList")}
              className="h-7 w-7 p-0"
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-4 bg-border/50 mx-1" />

            <Button variant="ghost" size="sm" onClick={handleImageUpload} className="h-7 w-7 p-0" title="Insert Image">
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onBlur={handleBlur}
          className={`min-h-full border-0 px-0 py-0 resize-none focus:outline-none bg-transparent text-base leading-relaxed font-light ${className}`}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
      </div>

      <ImageUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onInsertImage={insertImageFromUpload}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.6;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 10px 0;
          border-radius: 8px;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        [contenteditable] li {
          margin: 5px 0;
        }
        [contenteditable] strong {
          font-weight: 600;
        }
        [contenteditable] em {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
