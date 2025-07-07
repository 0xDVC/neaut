const WebSocket = require("ws")
const http = require("http")
const { v4: uuidv4 } = require("uuid")

// http server
const server = http.createServer()
const wss = new WebSocket.Server({ server })

// store active connections
const connections = new Map() 
const documentStates = new Map() 
const userSessions = new Map() 

wss.on("connection", (ws) => {
  console.log("New WebSocket connection")

  ws.on("message", (message) => {
    try {
      console.log("Received message:", message, "Type:", typeof message);

      let msgStr = "";
      if (typeof message === "string") {
        msgStr = message.trim();
      } else if (Buffer.isBuffer(message)) {
        msgStr = message.toString("utf8").trim();
      } else if (message instanceof ArrayBuffer || ArrayBuffer.isView(message)) {
        msgStr = Buffer.from(message).toString("utf8").trim();
      } else {
        console.warn("Unknown message type:", typeof message, message);
        return;
      }

      if (!msgStr) {
        console.warn("Empty message received, skipping.");
        return;
      }
      if (!(msgStr.startsWith("{") || msgStr.startsWith("["))) {
        console.warn("Skipping non-JSON message:", msgStr);
        return;
      }

      // Try parsing as JSON
      const data = JSON.parse(msgStr);
      handleMessage(ws, data);
    } catch (error) {
      console.error("Error processing message:", error, "Raw message:", message);
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  })

  ws.on("close", () => {
    handleDisconnection(ws)
  })

  ws.on("error", (error) => {
    console.error("WebSocket error:", error)
    handleDisconnection(ws)
  })
})

function handleMessage(ws, data) {
  const session = userSessions.get(ws)

  switch (data.type) {
    case "join-note":
      handleJoinNote(ws, data)
      break

    case "note-update":
      handleNoteUpdate(ws, data)
      break

    case "note-delete":
      handleNoteDelete(ws, data)
      break

    case "cursor-update":
      handleCursorUpdate(ws, data)
      break

    case "yjs-update":
      handleYjsUpdate(ws, data)
      break

    default:
      console.log("Unknown message type:", data.type)
  }
}

function handleJoinNote(ws, data) {
  const { noteId, userId, userName } = data

  // Store session info
  userSessions.set(ws, { noteId, userId: userId || uuidv4(), userName: userName || "Anonymous" })

  // Add to connections
  if (!connections.has(noteId)) {
    connections.set(noteId, new Set())
  }
  connections.get(noteId).add(ws)

  console.log(`User ${userName} joined note ${noteId}`)

  // Send current document state if exists
  if (documentStates.has(noteId)) {
    ws.send(
      JSON.stringify({
        type: "document-state",
        state: documentStates.get(noteId),
      }),
    )
  }

  // Notify others of new user
  broadcast(
    noteId,
    {
      type: "user-joined",
      userId,
      userName,
      timestamp: new Date().toISOString(),
    },
    ws,
  )
}

function handleNoteUpdate(ws, data) {
  const session = userSessions.get(ws)
  if (!session) return

  const { noteId } = session
  const note = data.note

  // Validate note data
  if (!note || !note.id) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid note data" }))
    return
  }

  // Store document state
  documentStates.set(noteId, note)

  console.log(`Note ${noteId} updated by ${session.userName}`)

  // Broadcast to all other clients
  broadcast(
    noteId,
    {
      type: "note-updated",
      note,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    },
    ws,
  )
}

function handleNoteDelete(ws, data) {
  const session = userSessions.get(ws)
  if (!session) return

  const { noteId } = data

  // Remove document state
  documentStates.delete(noteId)

  console.log(`Note ${noteId} deleted by ${session.userName}`)

  // Broadcast to all clients
  broadcast(noteId, {
    type: "note-deleted",
    noteId,
    userId: session.userId,
    timestamp: new Date().toISOString(),
  })

  // Clean up connections for this note
  if (connections.has(noteId)) {
    connections.delete(noteId)
  }
}

function handleCursorUpdate(ws, data) {
  const session = userSessions.get(ws)
  if (!session) return

  const { noteId } = session

  // Broadcast cursor position to other clients
  broadcast(
    noteId,
    {
      type: "cursor-update",
      cursor: {
        ...data.cursor,
        userId: session.userId,
        userName: session.userName,
      },
      timestamp: new Date().toISOString(),
    },
    ws,
  )
}

function handleYjsUpdate(ws, data) {
  const session = userSessions.get(ws)
  if (!session) return

  const { noteId } = session

  // Defensive: Only broadcast if update is a non-empty Buffer or Uint8Array
  if (!data.update || !(data.update instanceof Uint8Array || Buffer.isBuffer(data.update)) || data.update.length === 0) {
    console.warn("Skipping invalid or empty Yjs update:", data.update)
    return
  }

  broadcast(
    noteId,
    {
      type: "yjs-update",
      update: data.update,
      userId: session.userId,
    },
    ws,
  )
}

function handleDisconnection(ws) {
  const session = userSessions.get(ws)

  if (session) {
    const { noteId, userId, userName } = session

    console.log(`User ${userName} left note ${noteId}`)

    // Remove from connections
    if (connections.has(noteId)) {
      connections.get(noteId).delete(ws)

      // Clean up empty connections
      if (connections.get(noteId).size === 0) {
        connections.delete(noteId)
        // Keep document state for potential reconnections
      } else {
        // Notify others of user leaving
        broadcast(noteId, {
          type: "user-left",
          userId,
          userName,
          timestamp: new Date().toISOString(),
        })
      }
    }

    userSessions.delete(ws)
  }
}

function broadcast(noteId, message, excludeWs = null) {
  if (!connections.has(noteId)) return

  const noteConnections = connections.get(noteId)
  const messageStr = JSON.stringify(message)

  noteConnections.forEach((clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(messageStr)
      } catch (error) {
        console.error("Error broadcasting message:", error)
        // Remove broken connection
        noteConnections.delete(clientWs)
      }
    }
  })
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Health check available at http://localhost:${PORT}/health`)
})

// Health check endpoint
server.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    })
    res.end(
      JSON.stringify({
        status: "healthy",
        connections: connections.size,
        documents: documentStates.size,
        timestamp: new Date().toISOString(),
      }),
    )
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" })
    res.end("Not Found")
  }
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully")
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

// Add UUID dependency
try {
  require("uuid")
} catch (e) {
  console.error("Missing uuid dependency. Run: npm install uuid")
  process.exit(1)
}

const getBlocks = (content) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  // Get all block elements, including empty ones
  return Array.from(tempDiv.querySelectorAll("div, p, li, h1, h2, h3, h4, h5, h6"))
    .map(el => (el.textContent ?? "").replace(/\u200B/g, "").trimEnd());
};

const getTitle = (content) => {
  const blocks = getBlocks(content);
  // Use the first block as title, even if empty
  return blocks.length > 0 ? blocks[0] : "New Note";
};

const getPreview = (content) => {
  const blocks = getBlocks(content);
  // Use the second block as preview, even if empty
  return blocks.length > 1 && blocks[1] ? blocks[1] : "No additional text";
};
