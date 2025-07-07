"use client"
import { Eye } from "lucide-react"
import type { CollaboratorPresence } from "../types/distributed"

interface LayeredAvatarsProps {
  collaborators: CollaboratorPresence[]
  maxVisible?: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LayeredAvatars({ collaborators, maxVisible = 4, size = "md", className }: LayeredAvatarsProps) {
  const activeCollaborators = collaborators.filter((c) => c.isActive)
  const visibleCollaborators = activeCollaborators.slice(0, maxVisible)
  const remainingCount = Math.max(0, activeCollaborators.length - maxVisible)

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  }

  const offsetClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
  }

  if (activeCollaborators.length === 0) return null

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center">
        {visibleCollaborators.map((collaborator, index) => (
          <div
            key={collaborator.userId}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium border-2 border-background shadow-sm relative ${
              index > 0 ? offsetClasses[size] : ""
            }`}
            style={{
              backgroundColor: collaborator.color,
              zIndex: maxVisible - index,
            }}
            title={`${collaborator.userName} (${collaborator.permission})`}
          >
            {collaborator.userName.charAt(0).toUpperCase()}
            {collaborator.permission === "read" && (
              <Eye className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-background rounded-full p-0.5 text-muted-foreground" />
            )}
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-muted text-muted-foreground font-medium border-2 border-background shadow-sm ${offsetClasses[size]}`}
            style={{ zIndex: 0 }}
            title={`+${remainingCount} more`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  )
}
