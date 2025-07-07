"use client"

import { UploadedFileItem } from "./uploaded-file-item"

interface FileListProps {
  uploadedFiles: File[]
  fileProgresses: Record<string, number>
  removeFile: (filename: string) => void
  onInsertFile: (file: File) => void
}

export function FileList({ uploadedFiles, fileProgresses, removeFile, onInsertFile }: FileListProps) {
  if (uploadedFiles.length === 0) return null

  return (
    <div className="p-4 pt-0 space-y-2">
      <h4 className="text-sm font-medium text-foreground mb-2">Uploaded Files</h4>
      {uploadedFiles.map((file) => (
        <UploadedFileItem
          key={file.name}
          file={file}
          progress={fileProgresses[file.name] || 0}
          onRemove={removeFile}
          onInsert={onInsertFile}
        />
      ))}
    </div>
  )
}
