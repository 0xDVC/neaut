"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DistributedNoteEditor } from "../../../components/distributed-note-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "../../../services/database"
import type { DistributedNote } from "../../../types/distributed"
import { supabaseService } from "../../../services/supabase-service"
import { getAnonUserId } from "../../../lib/anon-user"

export default function SharedNotePage() {
  const params = useParams()
  const shareId = params.shareId as string
  const [note, setNote] = useState<DistributedNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSharedNote = async () => {
      try {
        // Try to fetch from Supabase by shareId
        let sharedNote = null
        try {
          sharedNote = await supabaseService.getNoteByShareId(shareId)
        } catch (e) {}
        if (!sharedNote) {
          // Fallback: try to find in IndexedDB (for local dev)
          const allNotes = await db.getAllNotes()
          sharedNote = allNotes.find((n) => n.shareId === shareId && n.isShared)
        }
        if (sharedNote) {
          // Join as collaborator if not already
          await supabaseService.joinSharedNote(sharedNote.id, sharedNote.defaultPermission)
          setNote(sharedNote)
        } else {
          setError("Note not found or not shared")
        }
      } catch (err) {
        console.error("Failed to load shared note:", err)
        setError("Failed to load note")
      } finally {
        setLoading(false)
      }
    }
    loadSharedNote()
  }, [shareId])

  const updateNote = async (noteId: string, updates: Partial<DistributedNote>) => {
    if (!note) return

    const updatedNote = { ...note, ...updates }
    setNote(updatedNote)

    try {
      await db.saveNote(updatedNote)
    } catch (error) {
      console.error("Failed to update shared note:", error)
    }
  }

  const shareNote = async (_noteId: string) => shareId;
  const unshareNote = () => {}

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Note not found</h1>
          <p className="text-muted-foreground mb-4">{error || "This shared note doesn't exist or has been removed."}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const activeCollaborators = note.collaborators.filter((c) => c.isActive).length

  return (
    <div className="h-screen bg-background">
      <SidebarProvider defaultOpen={false}>
        <SidebarInset className="flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Shared Note
              </Badge>
              {activeCollaborators > 0 && (
                <span className="text-sm text-muted-foreground">
                  {activeCollaborators} active collaborator{activeCollaborators !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {note.collaborators?.slice(0, 3).map((collaborator, index) => (
                <div
                  key={collaborator.userId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 border-background"
                  style={{ backgroundColor: collaborator.color }}
                  title={`${collaborator.userName} (${collaborator.permission})`}
                >
                  {collaborator.userName.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          <DistributedNoteEditor
            note={note}
            onUpdateNote={updateNote}
            onShareNote={shareNote}
            onUnshareNote={unshareNote}
          />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
