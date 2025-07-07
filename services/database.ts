"use client"

import type { DistributedNote } from "../types/distributed"

interface NotesDB extends IDBDatabase {
  // Type safety for our database
}

class DatabaseService {
  private db: NotesDB | null = null
  private readonly dbName = "NotesApp"
  private readonly version = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result as NotesDB
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result as NotesDB

        // Create notes store
        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" })
          notesStore.createIndex("updatedAt", "updatedAt", { unique: false })
          notesStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains("sync_metadata")) {
          const syncStore = db.createObjectStore("sync_metadata", { keyPath: "key" })
        }
      }
    })
  }

  async getAllNotes(): Promise<DistributedNote[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readonly")
      const store = transaction.objectStore("notes")
      const request = store.getAll()

      request.onsuccess = () => {
        const notes = request.result.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }))
        // Sort by updatedAt descending
        notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        resolve(notes)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getNote(id: string): Promise<DistributedNote | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readonly")
      const store = transaction.objectStore("notes")
      const request = store.get(id)

      request.onsuccess = () => {
        const note = request.result
        if (note) {
          resolve({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveNote(note: DistributedNote): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite")
      const store = transaction.objectStore("notes")
      const request = store.put({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["notes"], "readwrite")
      const store = transaction.objectStore("notes")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async setSyncMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["sync_metadata"], "readwrite")
      const store = transaction.objectStore("sync_metadata")
      const request = store.put({ key, value, timestamp: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncMetadata(key: string): Promise<any> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["sync_metadata"], "readonly")
      const store = transaction.objectStore("sync_metadata")
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result?.value || null)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new DatabaseService()
