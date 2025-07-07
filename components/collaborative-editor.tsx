"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { Bold, Italic, List, ListOrdered, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiveCursor } from "./live-cursor"
import { yjsService } from "../services/yjs-service"
import type { CursorPosition } from "../types/distributed"

interface CollaborativeEditorProps {
  noteId: string
  initialContent: string
  onChange: (content: string) => void
  onCursorChange?: () => void
  placeholder?: string
  className?: string
}

export function CollaborativeEditor({
  noteId,
  initialContent,
  onChange,
  onCursorChange,
  placeholder = "Start writing...",
  className,
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [yjsDoc, setYjsDoc] = useState<any>(null)
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const isUpdatingFromYjs = useRef(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const plainText = yjsService.htmlToText(initialContent)
    const doc = yjsService.createDocument(noteId, plainText)
    setYjsDoc(doc)

    const handleYjsUpdate = () => {
      if (editorRef.current && !isUpdatingFromYjs.current) {
        isUpdatingFromYjs.current = true
        const newText = doc.text.toString()
        const newHtml = yjsService.textToHtml(newText)
        editorRef.current.innerHTML = newHtml
        onChange(newHtml)
        isUpdatingFromYjs.current = false
      }
    }

    doc.text.observe(handleYjsUpdate)

    const mockCursors: CursorPosition[] = [
      {
        userId: "user-1",
        userName: "Alice",
        position: Math.floor(Math.random() * 100),
        color: "#FF6B6B",
      },
      {
        userId: "user-2",
        userName: "Bob",
        position: Math.floor(Math.random() * 100),
        color: "#4ECDC4",
      },
    ]

    const interval = setInterval(() => {
      setCursors(
        mockCursors.map((cursor) => ({
          ...cursor,
          position: Math.floor(Math.random() * 200),
        })),
      )
    }, 3000)

    return () => {
      doc.text.unobserve(handleYjsUpdate)
      clearInterval(interval)
    }
  }, [noteId, initialContent, onChange])

  const handleInput = () => {
    if (editorRef.current && yjsDoc && !isUpdatingFromYjs.current) {
      const newHtml = editorRef.current.innerHTML
      const newText = yjsService.htmlToText(newHtml)
      const currentText = yjsDoc.text.toString()

      if (newText !== currentText) {
        // Simple text replacement - in production, use proper diff
        yjsDoc.text.delete(0, yjsDoc.text.length)
        yjsDoc.text.insert(0, newText)
      }

      onChange(newHtml)
      onCursorChange?.()
    }
  }

  const handleMouseUp = () => {
    onCursorChange?.()
    checkSelection()
  }

  const handleKeyUp = () => {
    onCursorChange?.()
    checkSelection()
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

  const checkSelection = () => {
    const selection = window.getSelection()
    const hasText = selection && selection.toString().length > 0

    if (hasText && editorRef.current) {
      // Position toolbar near selection
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const editorRect = editorRef.current.getBoundingClientRect()

      setToolbarPosition({
        x: rect.left - editorRect.left + rect.width / 2,
        y: rect.top - editorRect.top - 50,
      })
      setShowToolbar(true)
    } else {
      setShowToolbar(false)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    // Show toolbar on right-click if there's any content
    if (editorRef.current && editorRef.current.textContent?.trim()) {
      e.preventDefault()
      const rect = editorRef.current.getBoundingClientRect()
      setToolbarPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 50,
      })
      setShowToolbar(true)
    }
  }

  const handleClick = () => {
    onCursorChange?.()
  }

  const handleFocus = () => {
    //setShowToolbar(true)
  }

  const handleBlur = (e: React.FocusEvent) => {
    //if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
    //  setTimeout(() => setShowToolbar(false), 150)
    //}
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = `<img src="${e.target?.result}" style="max-width: 100%; height: auto; margin: 10px 0;" alt="Uploaded image" />`
        document.execCommand("insertHTML", false, img)
        handleInput()
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isCommandActive = (command: string) => {
    return document.queryCommandState(command)
  }

  return (
    <div className="flex flex-col h-full relative">
      {showToolbar && (
        <div
          className="flex justify-start p-2 border-b border-border/20"
          style={{
            position: "absolute",
            top: toolbarPosition.y,
            left: toolbarPosition.x,
            transform: "translate(-50%, -100%)",
            zIndex: 10,
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-sm p-1.5 w-fit">
            <div className="flex items-center gap-0.5">
              <Button
                variant={isCommandActive("bold") ? "default" : "ghost"}
                size="sm"
                onClick={() => execCommand("bold")}
                className="h-7 w-7 p-0"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant={isCommandActive("italic") ? "default" : "ghost"}
                size="sm"
                onClick={() => execCommand("italic")}
                className="h-7 w-7 p-0"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>

              <div className="w-px h-4 bg-border/50 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => execCommand("insertUnorderedList")}
                className="h-7 w-7 p-0"
              >
                <List className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => execCommand("insertOrderedList")}
                className="h-7 w-7 p-0"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>

              <div className="w-px h-4 bg-border/50 mx-1" />

              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 w-7 p-0">
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`min-h-full border-0 px-0 py-0 resize-none focus:outline-none bg-transparent text-base leading-relaxed font-light ${className}`}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: initialContent }}
        />

        {/* Live cursors */}
        {cursors.map((cursor) => (
          <LiveCursor key={cursor.userId} cursor={cursor} containerRef={editorRef} />
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

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
