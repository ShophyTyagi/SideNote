'use client'

import styles from './DocumentList.module.css'
import { Document } from '@/lib/types'

interface DocumentListProps {
  documents: Document[]
  onToggleIncluded: (id: string) => void
  onRemove: (id: string) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function DocumentList({ documents, onToggleIncluded, onRemove }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyPrimary}>No documents yet.</p>
        <p className={styles.emptyHint}>Upload a file above to get started.</p>
      </div>
    )
  }

  return (
    <ul className={styles.list} aria-label="Document library">
      {documents.map((doc) => (
        <li key={doc.id} className={styles.item}>
          <label className={styles.checkWrapper} aria-label={`Include ${doc.filename} in search`}>
            <input
              type="checkbox"
              className={styles.checkInput}
              checked={doc.included}
              onChange={() => onToggleIncluded(doc.id)}
            />
            <span className={styles.checkmark} aria-hidden="true" />
          </label>

          <div className={styles.info}>
            <span className={styles.filename} title={doc.filename}>
              {doc.filename}
            </span>
            <span className={styles.meta}>
              {doc.numChunks > 0 ? `${doc.numChunks} chunks` : '\u2014'}
              {' \u00B7 '}
              {formatDate(doc.createdAt)}
              {' \u00B7 '}
              <span className={doc.state === 'ready' ? styles.statusReady : styles.statusFailed}>
                {doc.state === 'ready' ? 'Ready' : 'Failed'}
              </span>
            </span>
          </div>

          <button
            className={styles.removeBtn}
            onClick={() => onRemove(doc.id)}
            aria-label={`Remove ${doc.filename}`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}
