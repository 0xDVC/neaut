"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Check } from "lucide-react"
import { useEffect } from "react"

interface UploadedFileItemProps {
  file: File
  progress: number
  onRemove: (filename: string) => void
  onInsert: (file: File) => void
}

export function UploadedFileItem({ file, progress, onRemove, onInsert }: UploadedFileItemProps) {
  const imageUrl = URL.createObjectURL(file)

  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  const isComplete = progress >= 100

  return (
    <div className="border border-border rounded-lg p-3 flex items-center gap-3 bg-background">
      <div className="w-16 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
        <img src={imageUrl || "/placeholder.svg"} alt={file.name} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(file.size / 1024)} KB</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex-1">
            <div
              className={`h-full transition-all duration-300 ${isComplete ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${progress || 0}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(progress || 0)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isComplete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onInsert(file)}
            title="Insert into note"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
          onClick={() => onRemove(file.name)}
          title="Remove file"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
