import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimeoutPreventionOptions {
    intervalMinutes?: number; // Default 14 minutes
    countdownSeconds?: number; // Default 30 seconds for user to respond
    enabled?: boolean; // Whether the timeout prevention is enabled
    disabled?: boolean; // Additional condition to disable the timeout prevention
}

export const useTimeoutPrevention = (options: UseTimeoutPreventionOptions = {}) => {
    const {
        intervalMinutes = 14,
        countdownSeconds = 30,
        enabled = true,
        disabled = false
    } = options;

    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(countdownSeconds);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Function to simulate user activity
    const simulateActivity = useCallback(() => {
        // Simulate mouse movement
        const mouseEvent = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
        });
        
        // Simulate a click event
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
        });

        // Dispatch events to simulate user activity
        document.dispatchEvent(mouseEvent);
        document.dispatchEvent(clickEvent);
        
        // Update last activity timestamp
        lastActivityRef.current = Date.now();
        
        console.log('🔄 Simulated user activity to prevent timeout');
    }, []);



    // Function to handle user confirmation
    const handleUserConfirmation = useCallback(() => {
        setShowModal(false);
        simulateActivity();
        
        // Clear countdown
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        
        // The main interval continues running and will trigger again after intervalMs
        console.log('✅ User confirmed, main timer continues...');
    }, [simulateActivity]);

    // Function to close modal
    const closeModal = useCallback(() => {
        setShowModal(false);
        
        // Clear countdown
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        
        // Simulate activity anyway to prevent timeout
        simulateActivity();
        
        // The main interval continues running and will trigger again after intervalMs
        console.log('❌ Modal closed, main timer continues...');
    }, [simulateActivity]);

    // Main interval to show modal every 14 minutes
    useEffect(() => {
        if (!enabled || disabled) {
            // Clear any existing intervals when disabled
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                console.log('⏸️ Timeout prevention disabled - clearing intervals');
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
            // Hide modal if it's currently showing
            setShowModal(false);
            return;
        }

        const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
        console.log(`⏰ Starting timeout prevention timer: ${intervalMinutes} minutes (${intervalMs}ms)`);
        
        intervalRef.current = setInterval(() => {
            console.log('🔔 Timeout prevention modal triggered!');
            setShowModal(true);
            setCountdown(countdownSeconds);
            
            // Start countdown for this modal
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        // Auto-close modal and simulate activity
                        setShowModal(false);
                        simulateActivity();
                        
                        // Clear the countdown interval
                        if (countdownRef.current) {
                            clearInterval(countdownRef.current);
                            countdownRef.current = null;
                        }
                        
                        // The main interval will continue running and trigger again after intervalMs
                        console.log('⏰ Modal auto-closed, main timer continues...');
                        
                        return countdownSeconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, intervalMinutes, countdownSeconds, simulateActivity, disabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);



    return {
        showModal,
        countdown,
        handleUserConfirmation,
        closeModal,
        simulateActivity
    };
};
