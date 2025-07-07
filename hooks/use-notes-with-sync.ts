"use client"

import * as React from "react"
import { db } from "../services/database"
import { yjsService } from "../services/yjs-service"
import { syncService } from "../services/sync-service"
import type { DistributedNote } from "../types/distributed"
import { supabaseService } from "../services/supabase-service"
import { getAnonUserId } from "../lib/anon-user"

export function useNotesWithSync() {
  const [notes, setNotes] = React.useState<DistributedNote[]>([])
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [syncStatus, setSyncStatus] = React.useState<"online" | "offline" | "connecting">("connecting")

  React.useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await db.getAllNotes()
        if (savedNotes.length > 0) {
          setNotes(savedNotes)
          setSelectedNoteId(savedNotes[0].id)
        } else {
          const initialNote = await createInitialNote()
          setNotes([initialNote])
          setSelectedNoteId(initialNote.id)
        }
      } catch (error) {
        console.error("Failed to load notes:", error)
        const initialNote = await createInitialNote()
        setNotes([initialNote])
        setSelectedNoteId(initialNote.id)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotes()
  }, [])

  // Listen to sync events
  React.useEffect(() => {
    const unsubscribe = syncService.on((event) => {
      switch (event.type) {
        case "note-updated":
          if (event.note) {
            setNotes((prev) => {
              const existing = prev.find((n) => n.id === event.noteId)
              if (existing) {
                return prev.map((n) => (n.id === event.noteId ? event.note! : n))
              } else {
                return [event.note!, ...prev]
              }
            })
          }
          break

        case "note-deleted":
          setNotes((prev) => prev.filter((n) => n.id !== event.noteId))
          if (selectedNoteId === event.noteId) {
            setSelectedNoteId((prev) => {
              const remaining = notes.filter((n) => n.id !== event.noteId)
              return remaining.length > 0 ? remaining[0].id : null
            })
          }
          break

        case "sync-status":
          setSyncStatus(event.status!)
          break
      }
    })

    // Set initial sync status
    setSyncStatus(syncService.getStatus())

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [selectedNoteId, notes])

  const createInitialNote = async (): Promise<DistributedNote> => {
    const userId = getAnonUserId();
    const note: DistributedNote = {
      id: Date.now().toString(),
      content:
        "<div><strong>Welcome to Notes</strong></div><div>This is your first note with <em>rich text editing</em> and real-time sync!</div>",
      createdAt: new Date(),
      updatedAt: new Date(),
      isShared: false,
      collaborators: [],
      versions: [],
      vectorClock: { system: 1 },
      defaultPermission: "write",
      user_id: userId,
    } as any;

    await db.saveNote(note)
    return note
  }

  const createNote = async () => {
    const userId = getAnonUserId();
    const newNote: DistributedNote = {
      id: Date.now().toString(),
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isShared: false,
      collaborators: [],
      versions: [],
      vectorClock: { system: 1 },
      defaultPermission: "write",
      user_id: userId,
    } as any;

    await syncService.syncNote(newNote)
    setSelectedNoteId(newNote.id)
  }

  const updateNote = async (noteId: string, updates: Partial<DistributedNote>) => {
    const existingNote = notes.find((n) => n.id === noteId)
    if (!existingNote) return

    const updatedNote: DistributedNote = {
      ...existingNote,
      ...updates,
      updatedAt: new Date(),
    }

    await syncService.syncNote(updatedNote)
  }

  const deleteNote = async (noteId: string) => {
    await syncService.deleteNote(noteId)
  }

  const shareNote = async (noteId: string) => {
    const existingNote = notes.find((n) => n.id === noteId)
    if (!existingNote) return null
    // Generate a shareId
    const shareId = `note-${noteId}-${Date.now()}`
    // Mark as shared and sync to Supabase
    const sharedNote = { ...existingNote, isShared: true, shareId, collaborators: [] }
    await supabaseService.createNote(sharedNote.content, sharedNote.shareId)
    await updateNote(noteId, { isShared: true, shareId, collaborators: [] })
    return shareId
  }

  const unshareNote = async (noteId: string) => {
    const existingNote = notes.find((n) => n.id === noteId)
    if (existingNote && existingNote.shareId) {
      try {
        await supabaseService.deleteNote(existingNote.id)
      } catch (e) {
      }
    }
    await updateNote(noteId, { isShared: false, shareId: undefined, collaborators: [] })
  }

  const getYjsDocument = (noteId: string, initialContent?: string) => {
    return yjsService.createDocument(noteId, initialContent)
  }

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null

  return {
    notes,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
    isLoading,
    syncStatus,
    createNote,
    updateNote,
    deleteNote,
    shareNote,
    unshareNote,
    getYjsDocument,
  }
}
