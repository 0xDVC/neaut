"use client"
import { Search, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { DistributedNote } from "../types/distributed"

interface NotesSidebarProps {
  notes: DistributedNote[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  onCreateNote: () => void
  onDeleteNote: (noteId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function NotesSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  onSearchChange,
}: NotesSidebarProps) {
  const filteredNotes = notes.filter((note) => note.content.toLowerCase().includes(searchQuery.toLowerCase()))

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const getBlocks = (content: string) => {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = content
    const blocks: string[] = []
    tempDiv.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\u200B/g, "").trim() ?? ""
        blocks.push(text)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const text = (node.textContent || "").replace(/\u200B/g, "").trim()
        blocks.push(text)
      }
    })
    return blocks
  }

  const getTitle = (content: string) => {
    const blocks = getBlocks(content)
    return blocks[0] && blocks[0].length > 0 ? blocks[0] : "New Note"
  }

  const getPreview = (content: string) => {
    const blocks = getBlocks(content)
    return blocks[1] !== undefined ? blocks[1] : "No additional text"
  }

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Neaut</h2>
          <Button onClick={onCreateNote} size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground">
            {filteredNotes.length} {filteredNotes.length === 1 ? "Note" : "Notes"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNotes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectNote(note.id)}
                    className={cn("w-full justify-start p-3 h-auto group", selectedNoteId === note.id && "bg-accent")}
                  >
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate">{getTitle(note.content)}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{formatDate(note.updatedAt)}</span>
                            <Button
                              asChild
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteNote(note.id)
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span>
                                <Trash2 className="h-3 w-3" />
                              </span>
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{getPreview(note.content)}</p>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
