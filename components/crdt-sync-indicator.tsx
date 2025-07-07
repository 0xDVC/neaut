"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Wifi, WifiOff, Users, Clock } from "lucide-react"

interface CRDTSyncIndicatorProps {
  isConnected: boolean
  activeCollaborators: number
  lastSyncTime?: Date
}

export function CRDTSyncIndicator({ isConnected, activeCollaborators, lastSyncTime }: CRDTSyncIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("synced")

  useEffect(() => {
    if (!isConnected) {
      setSyncStatus("offline")
    } else {
      setSyncStatus("synced")
    }
  }, [isConnected])

  const formatLastSync = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        {isConnected ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
        <span className={isConnected ? "text-green-600" : "text-red-600"}>
          {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing..." : "Offline"}
        </span>
      </div>

      {activeCollaborators > 0 && (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{activeCollaborators} online</span>
        </div>
      )}

      {lastSyncTime && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatLastSync(lastSyncTime)}</span>
        </div>
      )}
    </div>
  )
}
