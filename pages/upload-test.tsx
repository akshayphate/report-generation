import React from 'react';
import { FileUpload } from '../components/FileUpload';
import styles from '../styles/Home.module.css';

const UploadTestPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.messageContainer}>
          <h1 className={styles.headMessage}>File Upload Test</h1>
          <p className={styles.message}>
            This page tests the file upload functionality with MongoDB GridFS storage. 
            Upload a ZIP file to see the job creation process in action.
          </p>
        </div>
        <FileUpload />
      </main>
    </div>
  );
};

export default UploadTestPage;
