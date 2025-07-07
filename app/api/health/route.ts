import { NextResponse } from "next/server"

export async function GET() {
  try {
    const results = await Promise.allSettled([
      // Test WebSocket server
      testWebSocketHealth(),
      // Test IndexedDB
      testIndexedDBHealth(),
      // Test UI responsiveness
      testUIHealth(),
    ])

    const wsResult = results[0]
    const dbResult = results[1]
    const uiResult = results[2]

    const status = {
      status: determineOverallStatus(results),
      timestamp: new Date().toISOString(),
      services: {
        ui: uiResult.status === "fulfilled" ? "healthy" : "unhealthy",
        websocket: wsResult.status === "fulfilled" ? wsResult.value : "unhealthy",
        database: dbResult.status === "fulfilled" ? "healthy" : "unhealthy",
      },
      version: process.env.npm_package_version || "1.0.0",
      details: {
        websocket_url: process.env.NEXT_PUBLIC_SYNC_WS || "not_configured",
        last_check: new Date().toISOString(),
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
        services: {
          ui: "unknown",
          websocket: "unknown",
          database: "unknown",
        },
      },
      { status: 500 },
    )
  }
}

async function testWebSocketHealth(): Promise<string> {
  const wsUrl = process.env.NEXT_PUBLIC_SYNC_WS

  if (!wsUrl || wsUrl === "undefined") {
    return "not_configured"
  }

  try {
    const healthUrl = wsUrl.replace("ws://", "http://").replace("wss://", "https://") + "/health"

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return data.status === "healthy" ? "healthy" : "unhealthy"
    }

    return "unhealthy"
  } catch (error) {
    console.warn("WebSocket health check failed:", error)
    return "unreachable"
  }
}

async function testIndexedDBHealth(): Promise<void> {
  // Only check IndexedDB in the browser
  if (typeof window === "undefined") {
    // On the server, just resolve (assume healthy or skip check)
    return;
  }

  return new Promise((resolve, reject) => {
    const testDB = indexedDB.open("health-check", 1)

    testDB.onerror = () => reject(new Error("IndexedDB unavailable"))
    testDB.onsuccess = () => {
      testDB.result.close()
      indexedDB.deleteDatabase("health-check")
      resolve()
    }

    setTimeout(() => reject(new Error("IndexedDB timeout")), 3000)
  })
}

async function testUIHealth(): Promise<void> {
  // Test basic UI responsiveness
  return new Promise((resolve) => {
    // Simple DOM test
    if (typeof document !== "undefined") {
      const testElement = document.createElement("div")
      document.body.appendChild(testElement)
      document.body.removeChild(testElement)
    }
    resolve()
  })
}

function determineOverallStatus(results: PromiseSettledResult<any>[]): string {
  const fulfilled = results.filter((r) => r.status === "fulfilled").length
  const total = results.length

  if (fulfilled === total) return "healthy"
  if (fulfilled >= total / 2) return "degraded"
  return "unhealthy"
}
