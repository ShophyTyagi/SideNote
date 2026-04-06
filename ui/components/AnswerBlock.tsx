import type { Ref } from 'react'
import styles from './AnswerBlock.module.css'
import { QAMetrics } from '@/lib/types'

interface AnswerBlockProps {
  ref?: Ref<HTMLElement>
  state: 'idle' | 'loading' | 'ready' | 'error'
  answer?: string
  error?: string
  metrics?: QAMetrics
  onRetry: () => void
}

export default function AnswerBlock({ ref, state, answer, error, metrics, onRetry }: AnswerBlockProps) {
  return (
    <section ref={ref} className={styles.block} aria-live="polite" aria-label="Answer">
      <h2 className={styles.title}>Answer</h2>

      {state === 'idle' && (
        <p className={styles.idle}>Upload documents and ask a question.</p>
      )}

      {state === 'loading' && (
        <div className={styles.skeleton} aria-label="Loading answer">
          <div className={`${styles.skLine} ${styles.skLong}`} />
          <div className={`${styles.skLine} ${styles.skFull}`} />
          <div className={`${styles.skLine} ${styles.skMed}`} />
          <div className={`${styles.skLine} ${styles.skFull}`} />
          <div className={`${styles.skLine} ${styles.skShort}`} />
        </div>
      )}

      {state === 'error' && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error ?? 'Something went wrong. Please try again.'}</p>
          <button className={styles.retryBtn} onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && answer && (
        <>
          <div className={styles.body}>
            {answer.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className={styles.paragraph}>
                {para}
              </p>
            ))}
          </div>

          <div className={styles.footer}>
            <span>Generated with Claude</span>
            <span className={styles.dot} aria-hidden="true">·</span>
            <span>Grounded in uploaded docs</span>
            {metrics && (
              <>
                <span className={styles.dot} aria-hidden="true">·</span>
                <span>{metrics.latency_ms.toLocaleString()}ms</span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
