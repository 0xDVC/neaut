"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, User, ArrowLeft, RotateCcw } from "lucide-react"
import type { VersionEntry } from "../types/distributed"

interface VersionHistoryProps {
  versions: VersionEntry[]
  currentContent: string
  onRestore: (version: VersionEntry) => void
  onClose: () => void
}

export function VersionHistory({ versions, currentContent, onRestore, onClose }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = React.useState<VersionEntry | null>(null)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const getChangesSummary = (changes: any[]) => {
    const insertions = changes.filter((c) => c.type === "insert").length
    const deletions = changes.filter((c) => c.type === "delete").length

    if (insertions && deletions) return `${insertions} additions, ${deletions} deletions`
    if (insertions) return `${insertions} addition${insertions !== 1 ? "s" : ""}`
    if (deletions) return `${deletions} deletion${deletions !== 1 ? "s" : ""}`
    return "No changes"
  }

  const sortedVersions = [...versions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-border/40 flex flex-col">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <Button onClick={onClose} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h3 className="font-semibold">Version History</h3>
          <p className="text-sm text-muted-foreground">{versions.length} versions</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Current version */}
            <div
              className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5 mb-2 cursor-pointer"
              onClick={() => setSelectedVersion(null)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
                <span className="text-sm font-medium">Now</span>
              </div>
              <p className="text-xs text-muted-foreground">Latest changes</p>
            </div>

            {sortedVersions.map((version, index) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border cursor-pointer mb-2 transition-colors ${
                  selectedVersion?.id === version.id
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:bg-muted/50"
                }`}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{version.userName}</span>
                  <Clock className="h-3 w-3 text-muted-foreground ml-auto" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{formatTime(version.timestamp)}</p>
                <p className="text-xs text-muted-foreground">{getChangesSummary(version.changes)}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">
                {selectedVersion ? `Version from ${formatTime(selectedVersion.timestamp)}` : "Current Version"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedVersion ? `By ${selectedVersion.userName}` : "Latest changes"}
              </p>
            </div>
            {selectedVersion && (
              <Button onClick={() => onRestore(selectedVersion)} size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {selectedVersion ? selectedVersion.content : currentContent}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
