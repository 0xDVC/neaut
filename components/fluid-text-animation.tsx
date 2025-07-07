"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TextChange {
  id: string
  type: "insert" | "delete" | "update"
  position: number
  text: string
  userId: string
  userName: string
  color: string
}

interface FluidTextAnimationProps {
  changes: TextChange[]
  children: React.ReactNode
  className?: string
}

export function FluidTextAnimation({ changes, children, className }: FluidTextAnimationProps) {
  const [animatingChanges, setAnimatingChanges] = React.useState<TextChange[]>([])

  React.useEffect(() => {
    if (changes.length > 0) {
      setAnimatingChanges(changes)

      // Clear animations after they complete
      const timer = setTimeout(() => {
        setAnimatingChanges([])
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [changes])

  return (
    <div className={`relative ${className}`}>
      {children}

      {/* Animated overlays for text changes */}
      <AnimatePresence>
        {animatingChanges.map((change) => (
          <motion.div
            key={change.id}
            className="absolute pointer-events-none"
            style={{
              left: `${change.position * 8}px`, // Approximate character width
              top: 0,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {change.type === "insert" && (
              <motion.div
                className="px-1 py-0.5 rounded text-xs text-white shadow-lg"
                style={{ backgroundColor: change.color }}
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10, opacity: 0 }}
              >
                +{change.text}
              </motion.div>
            )}

            {change.type === "delete" && (
              <motion.div
                className="px-1 py-0.5 rounded text-xs bg-red-500 text-white shadow-lg"
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: 10, opacity: 0 }}
              >
                -{change.text}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Ripple effect for remote changes */}
      <AnimatePresence>
        {animatingChanges.map((change) => (
          <motion.div
            key={`ripple-${change.id}`}
            className="absolute pointer-events-none rounded-full border-2 opacity-30"
            style={{
              borderColor: change.color,
              left: `${change.position * 8 - 10}px`,
              top: -10,
              width: 20,
              height: 20,
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
