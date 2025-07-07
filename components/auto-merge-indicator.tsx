"use client"

import * as React from "react"
import { useState } from "react"
import { GitMerge, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface MergeConflict {
  id: string
  position: number
  localText: string
  remoteText: string
  remoteUser: string
  timestamp: Date
}

interface AutoMergeIndicatorProps {
  conflicts: MergeConflict[]
  onResolveConflict: (conflictId: string, resolution: "local" | "remote" | "both") => void
  onDismissConflict: (conflictId: string) => void
  className?: string
}

export function AutoMergeIndicator({
  conflicts,
  onResolveConflict,
  onDismissConflict,
  className,
}: AutoMergeIndicatorProps) {
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null)

  if (conflicts.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {conflicts.map((conflict) => (
        <Card key={conflict.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <GitMerge className="h-4 w-4 text-orange-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Merge Conflict
                    </Badge>
                    <span className="text-xs text-muted-foreground">{conflict.remoteUser} edited the same text</span>
                  </div>
                  <Button
                    onClick={() => onDismissConflict(conflict.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {expandedConflict === conflict.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border-l-2 border-blue-400">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Your version:</div>
                        <div className="text-sm">{conflict.localText}</div>
                      </div>

                      <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded border-l-2 border-green-400">
                        <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                          {conflict.remoteUser}'s version:
                        </div>
                        <div className="text-sm">{conflict.remoteText}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => onResolveConflict(conflict.id, "local")}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                      >
                        Keep Mine
                      </Button>
                      <Button
                        onClick={() => onResolveConflict(conflict.id, "remote")}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                      >
                        Keep Theirs
                      </Button>
                      <Button
                        onClick={() => onResolveConflict(conflict.id, "both")}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Merge Both
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground truncate">
                      "{conflict.localText.substring(0, 30)}..." vs "{conflict.remoteText.substring(0, 30)}..."
                    </div>
                    <Button
                      onClick={() => setExpandedConflict(conflict.id)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
