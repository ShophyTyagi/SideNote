'use client'

import { useRef, useState, useCallback, DragEvent } from 'react'
import styles from './UploadCard.module.css'
import { Document } from '@/lib/types'

const ALLOWED_EXTS = ['.pdf', '.txt', '.md']
const MAX_MB = 25

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return `${file.name}: only PDF, TXT, and MD files are supported.`
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return `${file.name}: exceeds the ${MAX_MB}MB limit.`
  }
  return null
}

interface UploadCardProps {
  activeUploads: Document[]
  onFilesSelected: (files: File[]) => void
}

export default function UploadCard({ activeUploads, onFilesSelected }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState('')

  const processFiles = useCallback(
    (files: File[]) => {
      const valid: File[] = []
      const errors: string[] = []
      for (const file of files) {
        const err = validateFile(file)
        if (err) errors.push(err)
        else valid.push(file)
      }
      setValidationError(errors.join(' '))
      if (valid.length > 0) onFilesSelected(valid)
    },
    [onFilesSelected],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      processFiles(Array.from(e.dataTransfer.files))
    },
    [processFiles],
  )

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div className={styles.card}>
      {/* Drop zone — always visible */}
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={openPicker}
        onKeyDown={(e) => e.key === 'Enter' && openPicker()}
        tabIndex={0}
        role="button"
        aria-label="Upload documents — click or drop files here"
      >
        <span className={styles.dropIcon} aria-hidden="true">↑</span>
        <span className={styles.dropText}>Drop PDFs here</span>
        <span className={styles.orLine}>
          or{' '}
          <span className={styles.chooseLink}>choose files</span>
        </span>
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <ul className={styles.uploadList} aria-label="Upload progress">
          {activeUploads.map((doc) => (
            <li key={doc.id} className={styles.uploadRow}>
              <div className={styles.uploadMeta}>
                <span className={styles.uploadFilename}>{doc.filename}</span>
                <span
                  className={`${styles.uploadStatus} ${
                    doc.state === 'failed' ? styles.statusFailed : ''
                  }`}
                >
                  {doc.state === 'uploading' && `${doc.uploadProgress}%`}
                  {doc.state === 'indexing' && 'Indexing\u2026'}
                  {doc.state === 'failed' && 'Failed'}
                </span>
              </div>

              {doc.state === 'uploading' && (
                <div className={styles.progressTrack} aria-hidden="true">
                  <div
                    className={styles.progressFill}
                    style={{ width: `${doc.uploadProgress}%` }}
                  />
                </div>
              )}

              {doc.state === 'indexing' && (
                <div className={styles.progressTrack} aria-hidden="true">
                  <div className={styles.indexingPulse} />
                </div>
              )}

              {doc.state === 'failed' && (
                <p className={styles.uploadError}>
                  {doc.error ??
                    "Couldn't read this file. If it's a scanned PDF, try a text-based version."}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {validationError && <p className={styles.validationError}>{validationError}</p>}

      <p className={styles.caption}>PDF, TXT, MD · max {MAX_MB}MB · text-based PDFs index best.</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md"
        className={styles.hiddenInput}
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
