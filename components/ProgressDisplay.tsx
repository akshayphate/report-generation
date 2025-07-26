/**
 * @file ProgressDisplay.tsx
 * @description 
 * @author Damodar Perumalla
 * @created July 22, 2025
 */


import React from 'react';
import { ProcessingProgress } from '../services/evidenceService';
import styles from '../styles/assesment.module.css';

interface ProgressDisplayProps {
    progress: ProcessingProgress;
    isVisible: boolean;
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ progress, isVisible }) => {
    if (!isVisible) return null;

    const percentage = progress.totalControls > 0 
        ? Math.round((progress.completedControls / progress.totalControls) * 100) 
        : 0;

    return (
        <div className={styles.processingIndicator}>
            <div className={styles.progressCard}>
                <div className={styles.progressIconContainer}>
                    <div className={styles.spinner}></div>
                    <h3>Processing Vendor Assessment</h3>
                </div>
                
                <div className={styles.progressText}>
                    {progress.currentControl ? (
                        <p>Currently processing: <strong>{progress.currentControl}</strong></p>
                    ) : (
                        <p>Preparing assessment...</p>
                    )}
                </div>

                <div className={styles.progressBar}>
                    <div 
                        style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: 'var(--wf-red)',
                            borderRadius: '6px',
                            transition: 'width 0.3s ease'
                        }}
                    />
                </div>

                <div className={styles.progressPercentage}>
                    {progress.completedControls} of {progress.totalControls} controls processed ({percentage}%)
                </div>

                <div className={styles.progressDetails}>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong>Status:</strong> {progress.status === 'processing' ? 'Processing' : 'Completed'}
                    </div>
                    
                    {progress.currentControl && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong>Current Control:</strong> {progress.currentControl}
                        </div>
                    )}
                    
                    {progress.errors.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong>Errors:</strong> {progress.errors.length}
                            <ul style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                {progress.errors.slice(0, 3).map((error, index) => (
                                    <li key={index} style={{ color: 'var(--wf-red)' }}>
                                        {error}
                                    </li>
                                ))}
                                {progress.errors.length > 3 && (
                                    <li style={{ color: 'var(--wf-red)' }}>
                                        ... and {progress.errors.length - 3} more errors
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                    
                    <small>
                        Processing controls sequentially for better reliability and progress tracking.
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ProgressDisplay;