"use client"

import * as React from "react"

interface MergeConflict {
  id: string
  position: number
  localText: string
  remoteText: string
  remoteUser: string
  timestamp: Date
}

interface TextChange {
  id: string
  type: "insert" | "delete" | "update"
  position: number
  text: string
  userId: string
  userName: string
  color: string
}

export function useAutoMerge() {
  const [conflicts, setConflicts] = React.useState<MergeConflict[]>([])
  const [recentChanges, setRecentChanges] = React.useState<TextChange[]>([])

  // Smart merge algorithm
  const attemptAutoMerge = React.useCallback(
    (
      localContent: string,
      remoteContent: string,
      remoteUser: string,
      remoteUserId: string,
      remoteColor: string,
    ): { merged: string; conflicts: MergeConflict[]; changes: TextChange[] } => {
      // Simple diff algorithm (in production, use proper diff library like diff-match-patch)
      const localLines = localContent.split("\n")
      const remoteLines = remoteContent.split("\n")

      let merged = ""
      const newConflicts: MergeConflict[] = []
      const changes: TextChange[] = []

      const maxLines = Math.max(localLines.length, remoteLines.length)

      for (let i = 0; i < maxLines; i++) {
        const localLine = localLines[i] || ""
        const remoteLine = remoteLines[i] || ""

        if (localLine === remoteLine) {
          // No conflict, use either version
          merged += localLine + (i < maxLines - 1 ? "\n" : "")
        } else if (localLine === "") {
          // Remote added content - auto-merge
          merged += remoteLine + (i < maxLines - 1 ? "\n" : "")
          changes.push({
            id: `change-${Date.now()}-${i}`,
            type: "insert",
            position: i,
            text: remoteLine,
            userId: remoteUserId,
            userName: remoteUser,
            color: remoteColor,
          })
        } else if (remoteLine === "") {
          // Local added content - keep local
          merged += localLine + (i < maxLines - 1 ? "\n" : "")
        } else {
          // Real conflict - both modified same line
          const similarity = calculateSimilarity(localLine, remoteLine)

          if (similarity > 0.7) {
            // High similarity - attempt smart merge
            const smartMerged = smartMergeLines(localLine, remoteLine)
            merged += smartMerged + (i < maxLines - 1 ? "\n" : "")

            changes.push({
              id: `change-${Date.now()}-${i}`,
              type: "update",
              position: i,
              text: smartMerged,
              userId: remoteUserId,
              userName: remoteUser,
              color: remoteColor,
            })
          } else {
            // Low similarity - create conflict
            merged += localLine + (i < maxLines - 1 ? "\n" : "")

            newConflicts.push({
              id: `conflict-${Date.now()}-${i}`,
              position: i,
              localText: localLine,
              remoteText: remoteLine,
              remoteUser,
              timestamp: new Date(),
            })
          }
        }
      }

      return { merged, conflicts: newConflicts, changes }
    },
    [],
  )

  // Calculate text similarity (0-1)
  const calculateSimilarity = (text1: string, text2: string): number => {
    const longer = text1.length > text2.length ? text1 : text2
    const shorter = text1.length > text2.length ? text2 : text1

    if (longer.length === 0) return 1.0

    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Levenshtein distance calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Smart merge for similar lines
  const smartMergeLines = (local: string, remote: string): string => {
    // Simple word-level merge
    const localWords = local.split(" ")
    const remoteWords = remote.split(" ")

    const merged = []
    const maxWords = Math.max(localWords.length, remoteWords.length)

    for (let i = 0; i < maxWords; i++) {
      const localWord = localWords[i] || ""
      const remoteWord = remoteWords[i] || ""

      if (localWord === remoteWord) {
        merged.push(localWord)
      } else if (localWord === "") {
        merged.push(remoteWord)
      } else if (remoteWord === "") {
        merged.push(localWord)
      } else {
        // Choose longer word (simple heuristic)
        merged.push(localWord.length >= remoteWord.length ? localWord : remoteWord)
      }
    }

    return merged.filter((word) => word).join(" ")
  }

  const resolveConflict = React.useCallback((conflictId: string, resolution: "local" | "remote" | "both") => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId))

    // In a real implementation, you'd apply the resolution to the document
    console.log(`Resolved conflict ${conflictId} with resolution: ${resolution}`)
  }, [])

  const dismissConflict = React.useCallback((conflictId: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }, [])

  // Clear recent changes after animation
  React.useEffect(() => {
    if (recentChanges.length > 0) {
      const timer = setTimeout(() => {
        setRecentChanges([])
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [recentChanges])

  return {
    conflicts,
    recentChanges,
    attemptAutoMerge,
    resolveConflict,
    dismissConflict,
    setConflicts,
    setRecentChanges,
  }
}
