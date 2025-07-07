"use client"

import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

interface YjsDocument {
  doc: Y.Doc
  provider: WebsocketProvider | null
  text: Y.Text
  metadata: Y.Map<any>
}

class YjsService {
  private documents = new Map<string, YjsDocument>()
  private readonly wsUrl = process.env.NEXT_PUBLIC_SYNC_WS || "ws://localhost:3001"

  createDocument(noteId: string, initialContent?: string): YjsDocument {
    if (this.documents.has(noteId)) {
      return this.documents.get(noteId)!
    }

    const doc = new Y.Doc()
    const text = doc.getText("content")
    const metadata = doc.getMap("metadata")

    if (initialContent && text.length === 0) {
      text.insert(0, this.htmlToText(initialContent))
    }

    let provider: WebsocketProvider | null = null

    if (typeof window !== "undefined" && this.wsUrl) {
      try {
        provider = new WebsocketProvider(this.wsUrl, `note-${noteId}`, doc, {
          connect: true,
        })

        provider.on("status", (event: any) => {
          console.log(`YJS ${noteId} connection:`, event.status)
        })

        provider.on("connection-error", (error: any) => {
          console.warn(`YJS ${noteId} connection error:`, error)
        })
      } catch (error) {
        console.warn("Failed to create WebSocket provider:", error)
      }
    }

    const yjsDoc: YjsDocument = {
      doc,
      provider,
      text,
      metadata,
    }

    this.documents.set(noteId, yjsDoc)
    return yjsDoc
  }

  getDocument(noteId: string): YjsDocument | null {
    return this.documents.get(noteId) || null
  }

  destroyDocument(noteId: string): void {
    const yjsDoc = this.documents.get(noteId)
    if (yjsDoc) {
      yjsDoc.provider?.destroy()
      yjsDoc.doc.destroy()
      this.documents.delete(noteId)
    }
  }

  htmlToText(html: string): string {
    if (typeof window === "undefined") return html

    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = html
    return tempDiv.textContent || tempDiv.innerText || ""
  }

  textToHtml(text: string): string {
    return text
      .split("\n")
      .map((line) => (line.trim() ? `<div>${line}</div>` : "<div><br></div>"))
      .join("")
  }

  getAwareness(noteId: string) {
    const yjsDoc = this.documents.get(noteId)
    return yjsDoc?.provider?.awareness || null
  }

  destroy(): void {
    for (const [noteId] of this.documents) {
      this.destroyDocument(noteId)
    }
  }
}

export const yjsService = new YjsService()

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    yjsService.destroy()
  })
}
