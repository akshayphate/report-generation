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
    elapsedTime?: number;
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ progress, isVisible, elapsedTime = 0 }) => {
    if (!isVisible) return null;

    const percentage = progress.totalControls > 0 
        ? Math.round((progress.completedControls / progress.totalControls) * 100) 
        : 0;

    // Format elapsed time
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.progressContainer}>
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

                {/* Enhanced Progress Bar */}
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressBarFill}
                        style={{
                            width: `${percentage}%`
                        }}
                    />
                </div>

                <div className={styles.progressPercentage}>
                    {progress.completedControls} of {progress.totalControls} controls processed ({percentage}%)
                </div>

                {/* Stopwatch */}
                {elapsedTime > 0 && (
                    <div className={styles.stopwatchContainer}>
                        ⏱️ Elapsed Time: {formatTime(elapsedTime)}
                    </div>
                )}

                <div className={styles.progressDetails}>
                    <div className={styles.progressDetailItem}>
                        <strong>Status:</strong> {progress.status === 'processing' ? 'Processing' : 'Completed'}
                    </div>
                    
                    {progress.currentControl && (
                        <div className={styles.progressDetailItem}>
                            <strong>Current Control:</strong> {progress.currentControl}
                        </div>
                    )}
                    
                    {progress.errors.length > 0 && (
                        <div className={styles.progressDetailItem}>
                            <strong>Errors:</strong> {progress.errors.length}
                            <ul className={styles.errorList}>
                                {progress.errors.slice(0, 3).map((error, index) => (
                                    <li key={index} className={styles.errorItem}>
                                        {error}
                                    </li>
                                ))}
                                {progress.errors.length > 3 && (
                                    <li className={styles.errorItem}>
                                        ... and {progress.errors.length - 3} more errors
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                    
                    <small className={styles.progressNote}>
                        Processing controls sequentially for better reliability and progress tracking.
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ProgressDisplay;