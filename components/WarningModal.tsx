import React from 'react';
import styles from '../styles/assesment.module.css';


interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    largeFiles: Array<{ name: string; size: number }>;
}


export const WarningModal: React.FC<WarningModalProps> = ({ isOpen, onClose, onProceed, largeFiles }) => {
    if (!isOpen) return null;


    const formatFileSize = (bytes: number): string => {
        const mb = (bytes / (1024 * 1024)).toFixed(2);
        return `${mb} MB`;
    };


    return (
        <div className={styles['warning-modal-overlay']}>
            <div className={styles['warning-modal']} onClick={(e) => e.stopPropagation()}>
                <div className={styles['warning-modal-header']}>
                    <h2>⚠️ Large Files Warning</h2>
                    <button
                        onClick={onClose}
                        className={styles['warning-modal-close']}
                        aria-label="Close warning"
                    >
                        &times;
                    </button>
                </div>
                <div className={styles['warning-modal-content']}>
                    <p>The following files exceed the 10MB limit. LLM may not process large files reliably:</p>
                    <ul>
                                {largeFiles.map((file, index) => (
                            <li key={index}>
                                        {file.name} ({formatFileSize(file.size)})
                                    </li>
                                ))}
                            </ul>
                    <p>Do you want to proceed with processing these files?</p>
                </div>
                <div className={styles['warning-modal-actions']}>
                    <button
                        onClick={onClose}
                        className={styles['warning-modal-button']}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onProceed}
                        className={styles['warning-modal-button-primary']}
                    >
                        Proceed Anyway
                    </button>
                </div>
            </div>
        </div>
    );
};