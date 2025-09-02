import React, { useState, useCallback, useRef } from 'react';
import { formatFileSize } from '../utils/jobUtils';
import { useFileUpload } from '../hooks/useFileUpload';
import styles from '../styles/FileUpload.module.css';

export const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    selectedFile,
    uploading,
    uploadProgress,
    uploadResult,
    error,
    validationErrors,
    selectFile,
    uploadFile,
    resetUpload,
    clearError,
  } = useFileUpload({
    userId: 'test-user', // This should come from your auth system
  });
  
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  }, [selectFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      clearError();
      return;
    }

    await uploadFile();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFile, uploadFile, clearError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      selectFile(file);
    }
  }, [selectFile]);

  return (
    <div className={styles.fileUploadContainer}>
      <h2 className={styles.title}>Upload ZIP File</h2>
      <p className={styles.description}>
        Upload your ZIP file to begin processing. The file will be stored securely and processed in the background.
      </p>
      
      <div 
        className={`${styles.uploadZone} ${dragActive ? styles.dragActive : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className={styles.hiddenInput}
        />
        
        {selectedFile ? (
          <div className={styles.selectedFile}>
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>Selected file: {selectedFile.name}</p>
              <p className={styles.fileSize}>Size: {formatFileSize(selectedFile.size)}</p>
              <p className={styles.fileType}>Type: ZIP Archive</p>
            </div>
            
            {uploading && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className={styles.progressText}>{uploadProgress}% uploaded</p>
              </div>
            )}
            
            <div className={styles.actionButtons}>
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className={`${styles.uploadButton} ${uploading ? styles.uploading : ''}`}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
              {!uploading && (
                <button 
                  onClick={resetUpload}
                  className={styles.resetButton}
                >
                  Change File
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <div className={styles.uploadIcon}>📁</div>
            <p>Drag and drop a ZIP file here, or</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={styles.selectButton}
            >
              Select File
            </button>
            <p className={styles.uploadHint}>
              Maximum file size: 100MB • Supported format: ZIP only
            </p>
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <h4>File Validation Errors:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <h4>Upload Error:</h4>
          <p>{error}</p>
          <button 
            onClick={resetUpload}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      )}

      {uploadResult && (
        <div className={styles.uploadSuccess}>
          <div className={styles.successHeader}>
            <h3>✅ Upload Successful!</h3>
            <p>Your file has been uploaded and a processing job has been created.</p>
          </div>
          
          <div className={styles.jobInfo}>
            <h4>Job Details:</h4>
            <div className={styles.jobDetails}>
              <div className={styles.jobDetail}>
                <strong>Job ID:</strong> 
                <span className={styles.jobId}>{uploadResult.job.jobId}</span>
              </div>
              <div className={styles.jobDetail}>
                <strong>Status:</strong> 
                <span className={`${styles.status} ${styles[uploadResult.job.status]}`}>
                  {uploadResult.job.status}
                </span>
              </div>
              <div className={styles.jobDetail}>
                <strong>Progress:</strong> 
                <span>{uploadResult.job.progress}%</span>
              </div>
              <div className={styles.jobDetail}>
                <strong>Current Step:</strong> 
                <span>{uploadResult.job.currentStep}</span>
              </div>
              <div className={styles.jobDetail}>
                <strong>Created:</strong> 
                <span>{new Date(uploadResult.job.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.successActions}>
            <button 
              onClick={resetUpload}
              className={styles.newUploadButton}
            >
              Upload Another File
            </button>
            <p className={styles.nextSteps}>
              Your file is now being processed in the background. You can log out and check back later to see the progress.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
