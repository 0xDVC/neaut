"use client"

import { Upload } from "lucide-react"
import type React from "react"
import type { RefObject } from "react"

interface FileDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement | null>
  handleBoxClick: () => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileSelect: (files: FileList | null) => void
  isDragOver?: boolean
}

export function FileDropzone({
  fileInputRef,
  handleBoxClick,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  isDragOver = false,
}: FileDropzoneProps) {
  return (
    <div className="p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5 border-solid"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
        onClick={handleBoxClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="mb-3 bg-muted rounded-full p-3">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {isDragOver ? "Drop your images here" : "Upload images"}
        </p>
        <p className="text-xs text-muted-foreground">
          or{" "}
          <label
            htmlFor="fileUpload"
            className="text-primary hover:text-primary/90 font-medium cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            click to browse
          </label>{" "}
          (4MB max)
        </p>
        <input
          type="file"
          id="fileUpload"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>
    </div>
  )
}
