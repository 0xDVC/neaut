"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, Play, Pause, Square } from "lucide-react"

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
}

export function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
  const [transcription, setTranscription] = React.useState("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" })
        setAudioBlob(blob)

        // Mock transcription (in production, use speech-to-text API)
        setTimeout(() => {
          const mockTranscription =
            "This is a mock transcription of your voice note. In production, this would be real speech-to-text."
          setTranscription(mockTranscription)
          onTranscription(mockTranscription)
        }, 1000)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Failed to start recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioBlob && !isPlaying) {
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audioRef.current = audio

      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button onClick={startRecording} size="sm" className="bg-red-500 hover:bg-red-600">
            <Mic className="h-4 w-4 mr-2" />
            Record
          </Button>
        ) : (
          <Button onClick={stopRecording} size="sm" variant="destructive">
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}

        {isRecording && (
          <Badge variant="destructive" className="animate-pulse">
            Recording {formatTime(duration)}
          </Badge>
        )}

        {audioBlob && (
          <Button onClick={playAudio} size="sm" variant="outline">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {transcription && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-1">Transcription:</p>
          <p className="text-sm">{transcription}</p>
        </div>
      )}
    </div>
  )
}
