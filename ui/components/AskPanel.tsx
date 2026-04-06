'use client'

import { useRef, useEffect } from 'react'
import styles from './AskPanel.module.css'
import { Document } from '@/lib/types'

interface AskPanelProps {
  question: string
  onQuestionChange: (q: string) => void
  onAsk: () => void
  onClear: () => void
  includedDocs: Document[]
  canAsk: boolean
  loading: boolean
}

export default function AskPanel({
  question,
  onQuestionChange,
  onAsk,
  onClear,
  includedDocs,
  canAsk,
  loading,
}: AskPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea (max 4 lines ≈ 120px)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [question])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canAsk) {
      e.preventDefault()
      onAsk()
    }
  }

  const visibleChips = includedDocs.slice(0, 3)
  const extraCount = includedDocs.length - visibleChips.length

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Ask</h2>

      {/* Scope line */}
      <div className={styles.scope}>
        <span className={styles.scopeLabel}>
          Searching {includedDocs.length} document{includedDocs.length !== 1 ? 's' : ''}:
        </span>
        <div className={styles.chips}>
          {visibleChips.map((doc) => (
            <span key={doc.id} className={styles.chip} title={doc.filename}>
              {doc.filename.length > 22 ? doc.filename.slice(0, 20) + '\u2026' : doc.filename}
            </span>
          ))}
          {extraCount > 0 && <span className={styles.chipMore}>+{extraCount} more</span>}
          {includedDocs.length === 0 && (
            <span className={styles.scopeEmpty}>No documents selected</span>
          )}
        </div>
      </div>

      {/* Question input */}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        placeholder="Ask a question about your documents\u2026"
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        rows={2}
        aria-label="Question"
      />

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.askBtn} onClick={onAsk} disabled={!canAsk || loading}>
          {loading ? 'Thinking\u2026' : 'Ask'}
        </button>

        {question && (
          <button className={styles.clearBtn} onClick={onClear} disabled={loading}>
            Clear
          </button>
        )}

        <span className={styles.hint} aria-hidden="true">
          \u2318 Return to send
        </span>
      </div>
    </div>
  )
}
