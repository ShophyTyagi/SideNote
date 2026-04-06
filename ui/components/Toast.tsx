'use client'

import { useEffect, useState } from 'react'
import styles from './Toast.module.css'
import { Toast as ToastType } from '@/lib/types'

interface ToastContainerProps {
  toasts: ToastType[]
}

function ToastItem({ toast }: { toast: ToastType }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Delay one frame so the enter transition fires
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toast} ${visible ? styles.visible : ''}`}
    >
      <span
        className={`${styles.indicator} ${styles[toast.type]}`}
        aria-hidden="true"
      />
      <span className={styles.message}>{toast.message}</span>
    </div>
  )
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className={styles.container} aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
