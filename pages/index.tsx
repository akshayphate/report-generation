import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Third Party Risk Assessment
        </h1>
        
        <p className={styles.description}>
          Choose your preferred assessment method
        </p>

        <div className={styles.optionsContainer}>
          <Link href="/summarize" className={styles.optionCard}>
            <h2>Document Summarizer</h2>
            <p>Upload questionnaire and evidence files for batch processing</p>
          </Link>

          <Link href="/chat" className={styles.optionCard}>
            <h2>Chat-based Assessment</h2>
            <p>Interactive conversation for single vendor assessment</p>
          </Link>
        </div>
      </main>
    </div>
  );
} 