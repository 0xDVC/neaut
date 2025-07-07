"use client"

import * as React from "react"
import { yjsService } from "../services/yjs-service"
import { syncService } from "../services/sync-service"
import type { DistributedNote, CursorPosition } from "../types/distributed"
import { getAnonUserId } from "../lib/anon-user"

function getAnonUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  let name = localStorage.getItem("anon_user_name");
  if (!name) {
    name = `User ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("anon_user_name", name);
  }
  return name;
}

export function useDistributedNote(noteId: string, initialNote?: DistributedNote) {
  const [note, setNote] = React.useState<DistributedNote | null>(initialNote || null)
  const [cursors, setCursors] = React.useState<CursorPosition[]>([])
  const [isConnected, setIsConnected] = React.useState(false)
  const [currentUserId] = React.useState(() => getAnonUserId())
  const [currentUserName] = React.useState(() => getAnonUserName())
  const yjsDocRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (!noteId || !note) return
    if (!note.isShared || !note.shareId) {
      // If not shared, destroy any existing Yjs doc for this note
      if (yjsDocRef.current) {
        yjsService.destroyDocument(noteId)
        yjsDocRef.current = null
      }
      return
    }

    // Only create Yjs doc/provider for shared notes
    const yjsDoc = yjsService.createDocument(note.shareId, note.content)
    yjsDocRef.current = yjsDoc
    const handleYjsUpdate = () => {
      const newContent = yjsDoc.text.toString()
      if (newContent !== note.content) {
        setNote((prev) => (prev ? { ...prev, content: newContent, updatedAt: new Date() } : null))
      }
    }

    yjsDoc.text.observe(handleYjsUpdate)
    const awareness = yjsService.getAwareness(note.shareId)
    if (awareness) {
      const handleAwarenessChange = () => {
        const states = Array.from(awareness.getStates().entries())
        const remoteCursors = states
          .filter(([clientId]) => clientId !== awareness.clientID)
          .map(([clientId, state]) => ({
            userId: state.userId || `client-${clientId}`,
            userName: state.userName || "Anonymous",
            position: state.cursor?.position || 0,
            selection: state.cursor?.selection,
            color: state.color || "#4F46E5",
          }))
        setCursors(remoteCursors)
      }

      awareness.on("change", handleAwarenessChange)

      return () => {
        yjsDoc.text.unobserve(handleYjsUpdate)
        awareness.off("change", handleAwarenessChange)
      }
    }

    return () => {
      yjsDoc.text.unobserve(handleYjsUpdate)
      yjsService.destroyDocument(noteId)
      yjsDocRef.current = null
    }
  }, [noteId, note])

  React.useEffect(() => {
    const checkConnection = () => {
      setIsConnected(syncService.getStatus() === "online")
    }

    const unsubscribe = syncService.on((event) => {
      if (event.type === "sync-status") {
        setIsConnected(event.status === "online")
      }
    })

    checkConnection()
    const interval = setInterval(checkConnection, 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const updateContent = React.useCallback(
    (newContent: string) => {
      if (!note || !noteId) return
      const yjsDoc = yjsService.getDocument(noteId)
      if (yjsDoc) {
        const currentText = yjsDoc.text.toString()
        if (currentText !== newContent) {
          yjsDoc.text.delete(0, yjsDoc.text.length)
          yjsDoc.text.insert(0, newContent)
        }
      }

      const updatedNote = {
        ...note,
        content: newContent,
        updatedAt: new Date(),
      }
      setNote(updatedNote)
      syncService.syncNote(updatedNote)
    },
    [note, noteId],
  )

  const updateCursor = React.useCallback(
    (position: number, selection?: { start: number; end: number }) => {
      if (!noteId) return

      const awareness = yjsService.getAwareness(noteId)
      if (awareness) {
        awareness.setLocalStateField("cursor", {
          position,
          selection,
        })
        awareness.setLocalStateField("userId", currentUserId)
        awareness.setLocalStateField("userName", currentUserName)
        awareness.setLocalStateField("color", "#4F46E5")
      }
    },
    [noteId, currentUserId, currentUserName],
  )

  return {
    note,
    cursors,
    isConnected,
    currentUserId,
    updateContent,
    updateCursor,
    setNote,
  }
}
