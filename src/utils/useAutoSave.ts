/**
 * useAutoSave Hook - Automatically saves form data to localStorage
 * 
 * Features:
 * - Debounced save (configurable delay)
 * - Prevents data loss on browser crashes
 * - Restores data on component mount
 * - Clears saved data on successful submit
 * 
 * @param key - Unique localStorage key for this form
 * @param data - Form data to save
 * @param delay - Debounce delay in milliseconds (default: 2000ms)
 */
import { useEffect, useRef } from 'react';

export const useAutoSave = <T,>(key: string, data: T, delay: number = 2000) => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout for debounced save
        timeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`[AutoSave] Saved to ${key}`);
            } catch (error) {
                console.error('[AutoSave] Failed to save:', error);
            }
        }, delay);

        // Cleanup on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [key, data, delay]);
};

/**
 * Restore saved data from localStorage
 */
export const restoreAutoSave = <T,>(key: string): T | null => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            console.log(`[AutoSave] Restored from ${key}`);
            return JSON.parse(saved) as T;
        }
    } catch (error) {
        console.error('[AutoSave] Failed to restore:', error);
    }
    return null;
};

/**
 * Clear saved data from localStorage
 */
export const clearAutoSave = (key: string) => {
    try {
        localStorage.removeItem(key);
        console.log(`[AutoSave] Cleared ${key}`);
    } catch (error) {
        console.error('[AutoSave] Failed to clear:', error);
    }
};
