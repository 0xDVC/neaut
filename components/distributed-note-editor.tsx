"use client"

import * as React from "react"
import { useState } from "react"
import { Copy, Check, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// import { SidebarTrigger } from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDistributedNote } from "../hooks/use-distributed-note"
import { VersionHistory } from "./version-history"
import { ShareIcon } from "./share-icon"
import { RichTextEditor } from "./rich-text-editor"
import type { DistributedNote, Permission } from "../types/distributed"
import { LayeredAvatars } from "./layered-avatars"
import { AutoMergeIndicator } from "./auto-merge-indicator"
import { FluidTextAnimation } from "./fluid-text-animation"
import { useAutoMerge } from "../hooks/use-auto-merge"

interface DistributedNoteEditorProps {
  note: DistributedNote | null
  onUpdateNote: (noteId: string, updates: Partial<DistributedNote>) => void
  onShareNote: (noteId: string) => Promise<string | null>
  onUnshareNote: (noteId: string) => void
}

export function DistributedNoteEditor({
  note: initialNote,
  onUpdateNote,
  onShareNote,
  onUnshareNote,
}: DistributedNoteEditorProps) {
  const [content, setContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  const { note, cursors, isConnected, currentUserId, updateContent, updateCursor, setNote } = useDistributedNote(
    initialNote?.id || "",
    initialNote || undefined,
  )

  const { conflicts, recentChanges, attemptAutoMerge, resolveConflict, dismissConflict, setRecentChanges } =
    useAutoMerge()

  React.useEffect(() => {
    if (note) {
      setContent(note.content)
    } else {
      setContent("")
    }
  }, [note])

  const handleContentChange = (newContent: string) => {
    const previousContent = content
    setContent(newContent)

    if (note) {
      if (Math.random() > 0.8) {
        const mockRemoteContent = newContent + " [Remote edit]"
        const {
          merged,
          conflicts: newConflicts,
          changes,
        } = attemptAutoMerge(newContent, mockRemoteContent, "Alice", "user-alice", "#FF6B6B")

        if (newConflicts.length > 0) {
          // setConflicts(prev => [...prev, ...newConflicts]) // Corrected line
        }

        if (changes.length > 0) {
          setRecentChanges(changes)
        }
      }

      updateContent(newContent)
      onUpdateNote(note.id, { content: newContent, updatedAt: new Date() })
    }
  }

  const handleCursorChange = () => {
    updateCursor(0) 
  }

  const handleShare = async () => {
    if (note) {
      if (note.isShared) {
        onUnshareNote(note.id)
      } else {
        const newShareId = await onShareNote(note.id)
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

  const handleRestoreVersion = (version: any) => {
    if (note) {
      updateContent(version.content)
      setShowVersionHistory(false)
    }
  }

  const updateDefaultPermission = (permission: Permission) => {
    if (note) {
      onUpdateNote(note.id, { defaultPermission: permission })
    }
  }

  const updateCollaboratorPermission = (userId: string, permission: Permission) => {
    if (note) {
      const updatedCollaborators = note.collaborators.map((c) => (c.userId === userId ? { ...c, permission } : c))
      onUpdateNote(note.id, { collaborators: updatedCollaborators })
    }
  }

  const getTitle = (content: string) => {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = content
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    const firstLine = textContent.split("\n")[0].trim()
    return firstLine || "New Note"
  }

  if (showVersionHistory && note) {
    return (
      <VersionHistory
        versions={note.versions}
        currentContent={note.content}
        onRestore={handleRestoreVersion}
        onClose={() => setShowVersionHistory(false)}
      />
    )
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

  const activeCollaborators = note.collaborators.filter((c) => c.isActive).length

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          {note?.isShared && activeCollaborators > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-light">{activeCollaborators} editing</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LayeredAvatars collaborators={note.collaborators} maxVisible={3} size="md" />

          {/* Share Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ShareIcon className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Share this note</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {note.isShared
                      ? "This note is shared and can be collaborated on."
                      : "Share this note to collaborate with others."}
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

                    {/* Default Permission Setting */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Anyone with the link can</p>
                      <Select
                        value={note.defaultPermission}
                        onValueChange={(value: Permission) => updateDefaultPermission(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View only
                            </div>
                          </SelectItem>
                          <SelectItem value="write">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {note.collaborators.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Collaborators</p>
                        <div className="space-y-2">
                          {note.collaborators.map((collaborator) => (
                            <div key={collaborator.userId} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                  style={{ backgroundColor: collaborator.color }}
                                >
                                  {collaborator.userName.charAt(0).toUpperCase()}
                                </div>
                                <span>{collaborator.userName}</span>
                                {collaborator.isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Online
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={collaborator.permission}
                                onValueChange={(value: Permission) =>
                                  updateCollaboratorPermission(collaborator.userId, value)
                                }
                              >
                                <SelectTrigger className="w-24 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="read">View</SelectItem>
                                  <SelectItem value="write">Edit</SelectItem>
                                </SelectContent>
                              </Select>
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
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6 pb-4">
          <div className="text-center mb-6">
            <div
              className="text-sm text-muted-foreground font-light"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
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

        <div className="flex-1 px-6 pb-6 relative">
          {/* Auto-merge conflicts */}
          {conflicts.length > 0 && (
            <div className="mb-4">
              <AutoMergeIndicator
                conflicts={conflicts}
                onResolveConflict={resolveConflict}
                onDismissConflict={dismissConflict}
              />
            </div>
          )}

          {/* Fluid text animation wrapper */}
          <FluidTextAnimation changes={recentChanges}>
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              placeholder="Start writing..."
              className="min-h-full"
            />
          </FluidTextAnimation>
        </div>
      </div>
    </div>
  )
}
