"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Share2, Users, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface Note {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  isShared: boolean
  shareId?: string
  collaborators?: string[]
}

interface NoteEditorProps {
  note: Note | null
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void
  onShareNote: (noteId: string) => string
  onUnshareNote: (noteId: string) => void
}

export function NoteEditor({ note, onUpdateNote, onShareNote, onUnshareNote }: NoteEditorProps) {
  const [content, setContent] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (note) {
      setContent(note.content)
    } else {
      setContent("")
    }
  }, [note])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (note) {
      onUpdateNote(note.id, { content: newContent, updatedAt: new Date() })
    }
  }

  const handleShare = () => {
    if (note) {
      if (note.isShared) {
        onUnshareNote(note.id)
      } else {
        onShareNote(note.id)
      }
    }
  }

  const copyShareLink = async () => {
    if (note?.shareId) {
      const shareUrl = `${window.location.origin}/shared/${note.shareId}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getTitle = (content: string) => {
    const firstLine = content.split("\n")[0].trim()
    return firstLine || "New Note"
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Select a note to start writing</h3>
          <p className="text-sm text-muted-foreground">Choose a note from the sidebar or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          {note?.isShared && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Shared
              </Badge>
              {note.collaborators && note.collaborators.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {note.collaborators.length} collaborator{note.collaborators.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
        {note && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  {note.isShared ? "Sharing" : "Share"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Share this note</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {note.isShared
                        ? "This note is shared and can be collaborated on in real-time."
                        : "Share this note to collaborate with others in real-time."}
                    </p>
                  </div>

                  {note.isShared ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate">
                          {`${window.location.origin}/shared/${note.shareId}`}
                        </div>
                        <Button
                          onClick={copyShareLink}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 bg-transparent"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>

                      {note.collaborators && note.collaborators.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Collaborators</p>
                          <div className="space-y-1">
                            {note.collaborators.map((email, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  {email.charAt(0).toUpperCase()}
                                </div>
                                {email}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <Button onClick={handleShare} variant="outline" size="sm" className="w-full bg-transparent">
                        Stop Sharing
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleShare} className="w-full">
                      Share Note
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6 pb-4">
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground">
              {note.updatedAt.toLocaleDateString([], {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              at{" "}
              {note.updatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 pb-6">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            className="min-h-full border-0 px-0 py-0 resize-none focus-visible:ring-0 bg-transparent text-base leading-relaxed placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
    </div>
  )
}
