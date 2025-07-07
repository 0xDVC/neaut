"use client"

import { db } from "./database"
import { yjsService } from "./yjs-service"
import type { DistributedNote } from "../types/distributed"

const WS_URL = process.env.NEXT_PUBLIC_SYNC_WS
const WEBSOCKET_ENABLED = typeof WebSocket !== "undefined" && !!WS_URL

interface SyncEvent {
  type: "note-updated" | "note-created" | "note-deleted" | "sync-status"
  noteId?: string
  note?: DistributedNote
  status?: "online" | "offline" | "connecting"
}

class SyncService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners = new Set<(event: SyncEvent) => void>()
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncQueue: Array<{ action: string; data: any }> = []

  constructor() {
    if (typeof window !== "undefined") {
      this.setupOnlineOfflineHandlers()
      if (WEBSOCKET_ENABLED) {
        this.connect()
      } else {
        console.info("[sync-service] WebSocket disabled – running offline-only.")
      }
    }
  }

  private setupOnlineOfflineHandlers() {
    window.addEventListener("online", () => {
      this.isOnline = true
      this.emit({ type: "sync-status", status: "online" })
      if (WEBSOCKET_ENABLED) {
        this.connect()
        this.processSyncQueue()
      }
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.emit({ type: "sync-status", status: "offline" })
    })
  }

  private connect() {
    if (!this.isOnline || this.ws?.readyState === WebSocket.OPEN || !WEBSOCKET_ENABLED || !WS_URL) return

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log("[sync-service] Connected to WebSocket server")
        this.reconnectAttempts = 0
        this.emit({ type: "sync-status", status: "online" })
        this.processSyncQueue()
      }

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          this.handleServerMessage(data)
        } catch (e) {
          console.warn("[sync-service] Couldn't parse message:", e)
        }
      }

      this.ws.onclose = () => {
        console.log("[sync-service] WebSocket connection closed")
        this.emit({ type: "sync-status", status: "offline" })
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.warn("[sync-service] WebSocket error:", error)
        this.ws?.close()
      }
    } catch (e) {
      console.warn("[sync-service] WebSocket connection failed:", e)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.isOnline && WEBSOCKET_ENABLED) {
      setTimeout(() => {
        this.reconnectAttempts++
        console.log(`[sync-service] Reconnection attempt ${this.reconnectAttempts}`)
        this.connect()
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    }
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case "note-updated":
        this.handleRemoteNoteUpdate(data.note)
        break
      case "note-deleted":
        this.handleRemoteNoteDelete(data.noteId)
        break
      case "document-state":
        // Handle initial document state from server
        if (data.state) {
          this.handleRemoteNoteUpdate(data.state)
        }
        break
      default:
        console.log("Unknown sync message:", data)
    }
  }

  private async handleRemoteNoteUpdate(remoteNote: any) {
    try {
      // Convert dates
      const note: DistributedNote = {
        ...remoteNote,
        createdAt: new Date(remoteNote.createdAt),
        updatedAt: new Date(remoteNote.updatedAt),
        versions:
          remoteNote.versions?.map((v: any) => ({
            ...v,
            timestamp: new Date(v.timestamp),
          })) || [],
        collaborators:
          remoteNote.collaborators?.map((c: any) => ({
            ...c,
            lastSeen: new Date(c.lastSeen),
          })) || [],
      }

      // Check if we have a local version
      const localNote = await db.getNote(note.id)

      if (!localNote || localNote.updatedAt < note.updatedAt) {
        // Remote is newer, update local
        await db.saveNote(note)
        this.emit({ type: "note-updated", noteId: note.id, note })
      }
    } catch (error) {
      console.error("Failed to handle remote note update:", error)
    }
  }

  private async handleRemoteNoteDelete(noteId: string) {
    try {
      await db.deleteNote(noteId)
      yjsService.destroyDocument(noteId)
      this.emit({ type: "note-deleted", noteId })
    } catch (error) {
      console.error("Failed to handle remote note delete:", error)
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      // Queue for later
      this.syncQueue.push({ action: "send", data })
    }
  }

  private async processSyncQueue() {
    while (this.syncQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const item = this.syncQueue.shift()!
      if (item.action === "send") {
        this.ws.send(JSON.stringify(item.data))
      }
    }
  }

  // Public API
  async syncNote(note: DistributedNote) {
    try {
      // Save locally first
      await db.saveNote(note)

      // Send to server if online
      if (this.isOnline && WEBSOCKET_ENABLED) {
        this.send({
          type: "note-update",
          note: {
            ...note,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
            versions: note.versions.map((v) => ({
              ...v,
              timestamp: v.timestamp.toISOString(),
            })),
            collaborators: note.collaborators.map((c) => ({
              ...c,
              lastSeen: c.lastSeen.toISOString(),
            })),
          },
        })
      } else {
        // Queue for later sync
        this.syncQueue.push({
          action: "send",
          data: {
            type: "note-update",
            note: {
              ...note,
              createdAt: note.createdAt.toISOString(),
              updatedAt: note.updatedAt.toISOString(),
            },
          },
        })
      }

      this.emit({ type: "note-updated", noteId: note.id, note })
    } catch (error) {
      console.error("Failed to sync note:", error)
    }
  }

  async deleteNote(noteId: string) {
    try {
      // Delete locally first
      await db.deleteNote(noteId)
      yjsService.destroyDocument(noteId)

      // Send to server if online
      if (this.isOnline && WEBSOCKET_ENABLED) {
        this.send({
          type: "note-delete",
          noteId,
        })
      } else {
        // Queue for later sync
        this.syncQueue.push({
          action: "send",
          data: {
            type: "note-delete",
            noteId,
          },
        })
      }

      this.emit({ type: "note-deleted", noteId })
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  // Event system
  on(listener: (event: SyncEvent) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error("Sync event listener error:", error)
      }
    })
  }

  // Get connection status
  getStatus(): "online" | "offline" | "connecting" {
    if (!this.isOnline) return "offline"
    if (this.ws?.readyState === WebSocket.OPEN) return "online"
    return "connecting"
  }

  // Clean up
  destroy() {
    this.ws?.close()
    this.listeners.clear()
    yjsService.destroy()
  }
}

export const syncService = new SyncService()

// Clean up on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    syncService.destroy()
  })
}
