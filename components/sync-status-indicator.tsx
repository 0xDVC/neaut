"use client"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SyncStatusIndicatorProps {
  status: "online" | "offline" | "connecting"
  className?: string
}

export function SyncStatusIndicator({ status, className }: SyncStatusIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "online":
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Synced",
          variant: "default" as const,
          className: "text-green-600 border-green-200 bg-green-50",
        }
      case "connecting":
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          text: "Syncing",
          variant: "secondary" as const,
          className: "text-blue-600 border-blue-200 bg-blue-50",
        }
      case "offline":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Offline",
          variant: "destructive" as const,
          className: "text-red-600 border-red-200 bg-red-50",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Badge
      variant={statusInfo.variant}
      className={`flex items-center gap-1 text-xs ${statusInfo.className} ${className}`}
    >
      {statusInfo.icon}
      {statusInfo.text}
    </Badge>
  )
}
