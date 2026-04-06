import Link from 'next/link'
import styles from './Header.module.css'
import { ApiStatus } from '@/lib/types'

interface HeaderProps {
  status?: ApiStatus
}

export default function Header({ status }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.masthead}>What are we looking for?</Link>
        <nav className={styles.nav}>
          <Link href="/about" className={styles.navLink}>About</Link>
          {status && (
            <span className={styles.status}>
              <span
                className={`${styles.dot} ${status.connected ? styles.dotOnline : styles.dotOffline}`}
                aria-hidden="true"
              />
              <span>{status.label}</span>
            </span>
          )}
        </nav>
      </div>
      <div className={styles.rule} aria-hidden="true" />
    </header>
  )
}
