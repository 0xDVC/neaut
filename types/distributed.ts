export interface CursorPosition {
  userId: string
  userName: string
  position: number
  selection?: { start: number; end: number }
  color: string
}

export interface VersionEntry {
  id: string
  content: string
  timestamp: Date
  userId: string
  userName: string
  changes: TextChange[]
}

export interface TextChange {
  type: "insert" | "delete" | "retain"
  position: number
  content?: string
  length?: number
}

export type Permission = "read" | "write"

export interface CollaboratorPresence {
  userId: string
  userName: string
  email: string
  color: string
  lastSeen: Date
  isActive: boolean
  cursor?: CursorPosition
  permission: Permission
}

export interface DistributedNote {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  isShared: boolean
  shareId?: string
  collaborators: CollaboratorPresence[]
  versions: VersionEntry[]
  vectorClock: Record<string, number>
  defaultPermission: Permission
}
