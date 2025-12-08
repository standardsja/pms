/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import { getToken, getUser } from '../utils/auth';
import { getApiBaseUrl } from '../config/api';

// Get API URL from centralized configuration
const getApiUrl = () => {
    return getApiBaseUrl();
};

const API_URL = getApiUrl();

export interface Notification {
    id: number;
    userId: number;
    type: 'MENTION' | 'STAGE_CHANGED' | 'IDEA_APPROVED' | 'THRESHOLD_EXCEEDED' | 'EVALUATION_VERIFIED' | 'EVALUATION_RETURNED';
    message: string;
    data?: any;
    readAt: string | null;
    createdAt: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface NotificationResponse {
    success: boolean;
    data: Notification[];
    message?: string;
}
function authHeaders(): Record<string, string> {
    data?: {
        requestId?: number;
        ideaId?: number;
        status?: string;
        action?: string;
        url?: string;
        [key: string]: any;
    };
    const token = getToken();
    const user = getUser();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };

    // Backend accepts either x-user-id or Authorization: Bearer <token>
    if (user?.id) {
        // Convert string ID to number for backend
        const numericId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        if (!isNaN(numericId)) {
            h['x-user-id'] = String(numericId);
        }
    }
    if (token) {
        h['Authorization'] = `Bearer ${token}`;
    }

    return h;
}

/**
 * Fetch all notifications for the current user
 */
export async function fetchNotifications(): Promise<Notification[]> {
    try {
        const response = await fetch(`${API_URL}/api/notifications`, {
            headers: authHeaders(),
        });

        const result = await response.json();

        if (result.success) {
            return result.data;
        }
        // Silently return empty array on API errors
        return [];
    } catch (error) {
        // Silently handle connection errors (server not running, network issues, etc.)
        // This prevents console spam when backend is offline
        return [];
    }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: authHeaders(),
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        // Silently handle errors
        return false;
    }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        // Silently handle errors
        return false;
    }
}

/**
 * Get unread notification count
 */
export function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.readAt).length;
}
