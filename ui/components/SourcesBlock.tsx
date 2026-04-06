'use client'

import { useState } from 'react'
import styles from './SourcesBlock.module.css'
import { Citation } from '@/lib/types'

interface SourcesBlockProps {
  citations: Citation[]
  state: 'idle' | 'loading' | 'ready' | 'error'
}

function SourceItem({ citation, index }: { citation: Citation; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation.snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.num} aria-hidden="true">
          {index + 1}
        </span>
        <button
          className={styles.expandBtn}
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Open'}
        </button>
      </div>

      <p className={`${styles.snippet} ${expanded ? styles.snippetExpanded : ''}`}>
        &ldquo;{citation.snippet}&rdquo;
      </p>

      {expanded && (
        <div className={styles.expandedRow}>
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy quote'}
          </button>
        </div>
      )}
    </li>
  )
}

export default function SourcesBlock({ citations, state }: SourcesBlockProps) {
  const showEmpty =
    state === 'idle' || state === 'error' || (state === 'ready' && citations.length === 0)

  return (
    <section className={styles.block} aria-label="Sources">
      <h2 className={styles.title}>Sources</h2>

      {state === 'loading' && (
        <div className={styles.skeleton} aria-label="Loading sources">
          <div className={`${styles.skLine} ${styles.skLong}`} />
          <div className={`${styles.skLine} ${styles.skMed}`} />
          <div className={`${styles.skLine} ${styles.skShort}`} />
        </div>
      )}

      {showEmpty && (
        <p className={styles.none}>
          {state === 'idle'
            ? 'Sources will appear here after you ask a question.'
            : 'No sources (answer not grounded).'}
        </p>
      )}

      {state === 'ready' && citations.length > 0 && (
        <ol className={styles.list}>
          {citations.map((cit, i) => (
            <SourceItem key={`${cit.chunk_id}-${i}`} citation={cit} index={i} />
          ))}
        </ol>
      )}
    </section>
  )
}
