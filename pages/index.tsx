import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Document Summarizer
        </h1>
        
        <p className={styles.description}>
          Click below to start summarizing your documents
        </p>

        <Link href="/summarize" className={styles.button}>
          Go to Summarizer
        </Link>
      </main>
    </div>
  );
} 