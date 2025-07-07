"use client"

import { supabase } from "../lib/supabase"
import type { DistributedNote, VersionEntry, Permission } from "../types/distributed"
import { getAnonUserId } from "../lib/anon-user"

class SupabaseService {
  async getNotes(): Promise<DistributedNote[]> {
    const userId = getAnonUserId();
    const { data, error } = await supabase
      .from("notes")
      .select(`*`)
      .or(`user_id.eq.${userId},and(is_shared.eq.true,note_collaborators.user_id.eq.${userId})`)
      .order("updated_at", { ascending: false })
    if (error) throw error
    return data.map(this.transformNote)
  }

  async getNote(id: string): Promise<DistributedNote | null> {
    const userId = getAnonUserId();
    const { data, error } = await supabase
      .from("notes")
      .select(`*`)
      .eq("id", id)
      .or(`user_id.eq.${userId},and(is_shared.eq.true,note_collaborators.user_id.eq.${userId})`)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return this.transformNote(data)
  }

  async createNote(content = "", title?: string): Promise<DistributedNote> {
    const userId = getAnonUserId();
    const noteData = {
      title: title || this.extractTitle(content),
      content,
      user_id: userId,
      is_shared: false,
      default_permission: "write",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from("notes").insert(noteData).select().single()
    if (error) throw error
    return this.transformNote(data)
  }

  async updateNote(id: string, updates: Partial<DistributedNote>): Promise<void> {
    const userId = getAnonUserId();
    const { error } = await supabase
      .from("notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
    if (error) throw error
  }

  async deleteNote(id: string): Promise<void> {
    const userId = getAnonUserId();
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userId)
    if (error) throw error
  }

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop()
    const fileName = `guest/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage.from("note-images").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) throw error
    const { data: publicUrlData } = supabase.storage.from("note-images").getPublicUrl(data.path)
    return publicUrlData.publicUrl
  }

  // Real-time subscriptions
  subscribeToNotes(callback: (payload: any) => void) {
    return supabase
      .channel("notes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, callback)
      .subscribe()
  }

  subscribeToNote(noteId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`note-${noteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `id=eq.${noteId}`,
        },
        callback,
      )
      .subscribe()
  }

  // --- Version History ---
  // Assumes a note_versions table exists with: id, note_id, content, user_id, created_at
  async getNoteVersions(noteId: string): Promise<VersionEntry[]> {
    const { data, error } = await supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false })
    if (error) throw error
    // You may want to join with profiles for userName
    return (data || []).map((v: any) => ({
      id: v.id,
      content: v.content,
      timestamp: new Date(v.created_at),
      userId: v.user_id,
      userName: v.user_name || "Unknown",
      changes: v.changes || [],
    }))
  }

  async addNoteVersion(noteId: string, content: string, userId: string, userName: string, changes: any[] = []): Promise<void> {
    const { error } = await supabase.from("note_versions").insert({
      note_id: noteId,
      content,
      user_id: userId,
      user_name: userName,
      changes,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  // --- Collaborator Management ---
  async addCollaborator(noteId: string, collaboratorId: string, permission: Permission): Promise<void> {
    const { error } = await supabase.from("note_collaborators").insert({
      note_id: noteId,
      user_id: collaboratorId,
      permission,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  async removeCollaborator(noteId: string, collaboratorId: string): Promise<void> {
    const { error } = await supabase
      .from("note_collaborators")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", collaboratorId)
    if (error) throw error
  }

  async updateCollaboratorPermission(noteId: string, collaboratorId: string, permission: Permission): Promise<void> {
    const { error } = await supabase
      .from("note_collaborators")
      .update({ permission })
      .eq("note_id", noteId)
      .eq("user_id", collaboratorId)
    if (error) throw error
  }

  // --- User Ownership & Auth Integration ---
  getCurrentUserId(): string | null {
    const user = supabase.auth.getUser()
    // getUser() returns a promise in v2, so you may need to await this in real usage
    // Here, for simplicity, we assume a synchronous return or you can refactor to async
    // return user?.id || null
    // For now, fallback to guest
    return "guest"
  }

  // --- Permission Enforcement ---
  async hasPermission(noteId: string, userId: string, action: Permission): Promise<boolean> {
    // Owner always has write
    const { data: note } = await supabase.from("notes").select("user_id, default_permission").eq("id", noteId).single()
    if (!note) return false
    if (note.user_id === userId) return true
    // Check collaborator
    const { data: collab } = await supabase
      .from("note_collaborators")
      .select("permission")
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .single()
    if (collab && collab.permission === action) return true
    // Check default permission if note is shared
    if (note.default_permission === action) return true
    return false
  }

  // --- Update transformNote to include versions ---
  // Synchronous, does not fetch versions
  transformNote(note: any): DistributedNote {
    return {
      id: note.id,
      content: note.content,
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
      isShared: note.is_shared,
      shareId: note.share_id,
      collaborators:
        note.note_collaborators?.map((collab: any) => ({
          userId: collab.user_id,
          userName: collab.profiles?.full_name || collab.profiles?.email || "Anonymous",
          email: collab.profiles?.email || "",
          permission: collab.permission,
          color: this.generateUserColor(collab.user_id),
          lastSeen: new Date(),
          isActive: false, // Will be updated by real-time presence
        })) || [],
      versions: [], // Use transformNoteWithVersions for full version history
      vectorClock: { system: 1 },
      defaultPermission: note.default_permission || "read",
    }
  }

  // Async version for when you need versions
  async transformNoteWithVersions(note: any): Promise<DistributedNote> {
    let versions: VersionEntry[] = []
    try {
      versions = await this.getNoteVersions(note.id)
    } catch {}
    return {
      ...this.transformNote(note),
      versions,
    }
  }

  // Helper methods
  private extractTitle(content: string): string {
    if (typeof document === "undefined") return "Untitled"

    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = content
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    const firstLine = textContent.split("\n")[0].trim()
    return firstLine || "Untitled"
  }

  private generateUserColor(userId: string): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ]
    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  async getNoteByShareId(shareId: string): Promise<DistributedNote | null> {
    const { data, error } = await supabase
      .from("notes")
      .select(`*`)
      .eq("share_id", shareId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return this.transformNote(data)
  }

  // Add the current anon user as a collaborator if not already present
  async joinSharedNote(noteId: string, permission: Permission = "read"): Promise<void> {
    const userId = getAnonUserId();
    // Check if already a collaborator
    const { data: existing } = await supabase
      .from("note_collaborators")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .single();
    if (!existing) {
      await this.addCollaborator(noteId, userId, permission);
    }
  }

  // Check if the current user is a collaborator on a note
  async isCollaborator(noteId: string): Promise<boolean> {
    const userId = getAnonUserId();
    const { data: collab } = await supabase
      .from("note_collaborators")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .single();
    return !!collab;
  }
}

export const supabaseService = new SupabaseService()
