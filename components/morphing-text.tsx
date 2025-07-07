"use client"

import * as React from "react"
import { motion } from "framer-motion"

interface MorphingTextProps {
  text: string
  previousText?: string
  className?: string
  animationDuration?: number
}

export function MorphingText({ text, previousText, className, animationDuration = 0.3 }: MorphingTextProps) {
  const [displayText, setDisplayText] = React.useState(text)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    if (previousText && previousText !== text) {
      setIsAnimating(true)

      const animateText = async () => {
        const maxLength = Math.max(previousText.length, text.length)

        for (let i = 0; i <= maxLength; i++) {
          await new Promise((resolve) => setTimeout(resolve, (animationDuration * 1000) / maxLength))

          const morphedText = text.slice(0, i) + previousText.slice(i)
          setDisplayText(morphedText.slice(0, text.length))
        }

        setDisplayText(text)
        setIsAnimating(false)
      }

      animateText()
    } else {
      setDisplayText(text)
    }
  }, [text, previousText, animationDuration])

  return (
    <motion.span
      className={className}
      animate={{
        opacity: isAnimating ? [1, 0.7, 1] : 1,
      }}
      transition={{
        duration: animationDuration,
        ease: "easeInOut",
      }}
    >
      {displayText}
    </motion.span>
  )
}
