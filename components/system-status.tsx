"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface SystemHealth {
  status: "healthy" | "unhealthy" | "degraded"
  timestamp: string
  services: {
    ui: string
    websocket: string
    database: string
  }
  version?: string
}

export function SystemStatus() {
  const [health, setHealth] = React.useState<SystemHealth | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)
  const [realTimeStatus, setRealTimeStatus] = React.useState({
    websocket: false,
    online: navigator.onLine,
  })

  // Monitor real-time connection status
  React.useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_SYNC_WS
    let ws: WebSocket | null = null

    if (wsUrl) {
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setRealTimeStatus((prev) => ({ ...prev, websocket: true }))
        }

        ws.onclose = () => {
          setRealTimeStatus((prev) => ({ ...prev, websocket: false }))
        }

        ws.onerror = () => {
          setRealTimeStatus((prev) => ({ ...prev, websocket: false }))
        }
      } catch (error) {
        setRealTimeStatus((prev) => ({ ...prev, websocket: false }))
      }
    }

    const handleOnline = () => setRealTimeStatus((prev) => ({ ...prev, online: true }))
    const handleOffline = () => setRealTimeStatus((prev) => ({ ...prev, online: false }))

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      ws?.close()
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/health")
      const data = await response.json()
      setHealth(data)
      setLastChecked(new Date())
    } catch (error) {
      console.error("Health check failed:", error)
      setHealth({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          ui: "unhealthy",
          websocket: "unknown",
          database: "unknown",
        },
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    checkHealth()
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Rest of the component stays the same but use realTimeStatus for immediate feedback
  const getStatusInfo = () => {
    if (!health) return { color: "gray", text: "Checking...", icon: RefreshCw }

    // Use real-time status for more accurate reporting
    const uiHealthy = health.services.ui === "healthy"
    const wsHealthy = realTimeStatus.websocket || health.services.websocket === "not_configured"
    const dbHealthy = health.services.database === "healthy"
    const isOnline = realTimeStatus.online

    if (!isOnline) {
      return {
        color: "red",
        text: "No internet connection",
        icon: XCircle,
        variant: "destructive" as const,
      }
    }

    if (uiHealthy && wsHealthy && dbHealthy) {
      return {
        color: "green",
        text: "All systems operational",
        icon: CheckCircle,
        variant: "default" as const,
      }
    } else if (uiHealthy && dbHealthy && !realTimeStatus.websocket) {
      return {
        color: "yellow",
        text: "Offline mode - sync disabled",
        icon: AlertCircle,
        variant: "secondary" as const,
      }
    } else if (uiHealthy || dbHealthy) {
      return {
        color: "yellow",
        text: "Partial service issues",
        icon: AlertCircle,
        variant: "secondary" as const,
      }
    } else {
      return {
        color: "red",
        text: "Multiple system failures",
        icon: XCircle,
        variant: "destructive" as const,
      }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.color }} />
          {statusInfo.text}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">System Status</h4>
            <Button onClick={checkHealth} disabled={loading} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {health && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Interface</span>
                  <Badge variant={health.services.ui === "healthy" ? "default" : "destructive"} className="text-xs">
                    {health.services.ui}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Real-time Sync</span>
                  <Badge
                    variant={
                      realTimeStatus.websocket
                        ? "default"
                        : health.services.websocket === "not_configured"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {health.services.websocket === "not_configured" ? "offline" : health.services.websocket}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Local Storage</span>
                  <Badge
                    variant={health.services.database === "healthy" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {health.services.database}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div>Last checked: {lastChecked?.toLocaleTimeString()}</div>
                {health.version && <div>Version: {health.version}</div>}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
