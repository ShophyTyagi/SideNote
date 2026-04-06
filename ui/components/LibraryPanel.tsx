import styles from './LibraryPanel.module.css'

interface LibraryPanelProps {
  children: React.ReactNode
}

export default function LibraryPanel({ children }: LibraryPanelProps) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Library</h2>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
