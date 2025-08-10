import React, { useEffect, useRef } from 'react';
import styles from '../styles/assesment.module.css';

interface TimeoutPreventionModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
    countdown: number;
}

export const TimeoutPreventionModal: React.FC<TimeoutPreventionModalProps> = ({ 
    isOpen, 
    onConfirm, 
    onClose, 
    countdown 
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Auto-close after countdown reaches 0
    useEffect(() => {
        if (countdown <= 0) {
            onClose();
        }
    }, [countdown, onClose]);

    // Simulate a mouse click to prevent timeout
    const handleConfirm = () => {
        // Simulate a mouse click event
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 100,
            clientY: 100
        });
        
        // Dispatch the event on the document body to simulate activity
        document.body.dispatchEvent(clickEvent);
        
        onConfirm();
    };

    if (!isOpen) return null;

    return (
        <div className={styles['warning-modal-overlay']}>
            <div 
                ref={modalRef}
                className={styles['warning-modal']} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles['warning-modal-header']}>
                    <h2>⏰ Session Timeout Prevention</h2>
                </div>
                <div className={styles['warning-modal-content']}>
                    <div className={styles['countdown-indicator']}>
                        <div className={styles['countdown-circle']}>
                            <span className={styles['countdown-number']}>{countdown}</span>
                        </div>
                    </div>
                    <p>Are you still there? Your session will timeout in <strong>{countdown} seconds</strong>.</p>
                    <p>Click "Yes, I'm here" to keep your session active.</p>
                </div>
                <div className={styles['warning-modal-actions']}>
                    <button
                        onClick={handleConfirm}
                        className={styles['warning-modal-button-primary']}
                        autoFocus
                    >
                        Yes, I'm here
                    </button>
                    <button
                        onClick={onClose}
                        className={styles['warning-modal-button']}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
