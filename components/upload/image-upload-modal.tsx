"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { useRef, useState } from "react"
import { FileDropzone } from "./file-dropzone"
import { FileList } from "./file-list"
import { supabaseService } from "../../services/supabase-service"
import { toast } from "sonner"

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onInsertImage: (imageUrl: string, fileName: string) => void
}

export function ImageUploadModal({ isOpen, onClose, onInsertImage }: ImageUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [fileProgresses, setFileProgresses] = useState<Record<string, number>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({})

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter((file) => {
      // Only allow images under 4MB
      return file.type.startsWith("image/") && file.size <= 4 * 1024 * 1024
    })

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Upload to Supabase
    newFiles.forEach(async (file) => {
      try {
        // Simulate progress
        let progress = 0
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5
          if (progress >= 90) {
            clearInterval(progressInterval)
          }
          setFileProgresses((prev) => ({
            ...prev,
            [file.name]: Math.min(progress, 90),
          }))
        }, 200)

        // Actual upload
        const imageUrl = await supabaseService.uploadImage(file)

        // Complete progress
        setFileProgresses((prev) => ({
          ...prev,
          [file.name]: 100,
        }))

        // Store URL for insertion
        setUploadedUrls((prev) => ({
          ...prev,
          [file.name]: imageUrl,
        }))

        toast.success(`${file.name} uploaded successfully!`)
      } catch (error) {
        console.error("Upload failed:", error)
        toast.error(`Failed to upload ${file.name}`)
        removeFile(file.name)
      }
    })
  }

  const handleBoxClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (filename: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== filename))
    setFileProgresses((prev) => {
      const newProgresses = { ...prev }
      delete newProgresses[filename]
      return newProgresses
    })
    setUploadedUrls((prev) => {
      const newUrls = { ...prev }
      delete newUrls[filename]
      return newUrls
    })
  }

  const handleInsertFile = (file: File) => {
    const imageUrl = uploadedUrls[file.name]
    if (imageUrl) {
      onInsertImage(imageUrl, file.name)
      removeFile(file.name)
    }
  }

  const handleClose = () => {
    // Clean up uploaded files
    setUploadedFiles([])
    setFileProgresses({})
    setUploadedUrls({})
    setIsDragOver(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0">
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-medium">Upload Images</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">Add images to your note with drag and drop</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div onDragLeave={handleDragLeave}>
              <FileDropzone
                fileInputRef={fileInputRef}
                handleBoxClick={handleBoxClick}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                handleFileSelect={handleFileSelect}
                isDragOver={isDragOver}
              />

              <FileList
                uploadedFiles={uploadedFiles}
                fileProgresses={fileProgresses}
                removeFile={removeFile}
                onInsertFile={handleInsertFile}
              />
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Images stored securely in Supabase • Max size: 4MB</p>
              <Button onClick={handleClose} variant="outline" size="sm">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
