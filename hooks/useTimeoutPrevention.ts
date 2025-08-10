import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimeoutPreventionOptions {
    intervalMinutes?: number; // Default 14 minutes
    countdownSeconds?: number; // Default 30 seconds for user to respond
    enabled?: boolean; // Whether the timeout prevention is enabled
}

export const useTimeoutPrevention = (options: UseTimeoutPreventionOptions = {}) => {
    const {
        intervalMinutes = 14,
        countdownSeconds = 30,
        enabled = true
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

    // Function to show the timeout prevention modal
    const showTimeoutModal = useCallback(() => {
        setShowModal(true);
        setCountdown(countdownSeconds);
        
        // Start countdown
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Auto-close modal and simulate activity
                    setShowModal(false);
                    simulateActivity();
                    return countdownSeconds;
                }
                return prev - 1;
            });
        }, 1000);
    }, [countdownSeconds, simulateActivity]);

    // Function to handle user confirmation
    const handleUserConfirmation = useCallback(() => {
        setShowModal(false);
        simulateActivity();
        
        // Clear countdown
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
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
    }, [simulateActivity]);

    // Main interval to show modal every 14 minutes
    useEffect(() => {
        if (!enabled) return;

        const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
        
        intervalRef.current = setInterval(() => {
            showTimeoutModal();
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, intervalMinutes, showTimeoutModal]);

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

    // Reset interval when user confirms
    const resetInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        const intervalMs = intervalMinutes * 60 * 1000;
        intervalRef.current = setInterval(() => {
            showTimeoutModal();
        }, intervalMs);
    }, [intervalMinutes, showTimeoutModal]);

    return {
        showModal,
        countdown,
        handleUserConfirmation,
        closeModal,
        resetInterval,
        simulateActivity
    };
};
