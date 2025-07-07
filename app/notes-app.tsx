"use client"

import * as React from "react"
import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { NotesSidebar } from "../components/notes-sidebar"
import { DistributedNoteEditor } from "../components/distributed-note-editor"
import { SystemStatus } from "../components/system-status"
import { useNotesWithSync } from "../hooks/use-notes-with-sync"
import { Button } from "@/components/ui/button"

import { Toaster } from "sonner"

export default function NotesApp() {
  const {
    notes,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    shareNote,
    unshareNote,
  } = useNotesWithSync()

  const [searchQuery, setSearchQuery] = useState("")

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background">
      <SidebarProvider defaultOpen>
        <NotesSidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <SidebarInset className="flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <SystemStatus />
          </div>
          <div className="flex-1">
            <DistributedNoteEditor
              note={selectedNote}
              onUpdateNote={updateNote}
              onShareNote={(noteId) => shareNote(noteId)}
              onUnshareNote={(noteId) => unshareNote(noteId)}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Toaster position="top-right" />
    </div>
  )
}
