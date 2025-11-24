/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import { getToken, getUser } from '../utils/auth';

// Smart API URL detection: use current hostname for production, localhost for local dev
const getApiUrl = () => {
    // If VITE_API_URL is explicitly set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Check if running on localhost or 127.0.0.1
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHeron = window.location.hostname === 'heron';

    if (isLocal) {
        return 'http://localhost:4000';
    }

    if (isHeron) {
        return 'http://heron:4000';
    }

    // Production: use the same hostname as frontend
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:4000`;
};

const API_URL = getApiUrl();

export interface Notification {
    id: number;
    userId: number;
    type: 'MENTION' | 'STAGE_CHANGED' | 'IDEA_APPROVED';
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
    const token = getToken();
    const user = getUser();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };

    // Backend accepts either x-user-id or Authorization: Bearer <id>
    if (user?.id) {
        h['x-user-id'] = user.id;
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
        console.error('Failed to fetch notifications:', result.message);
        return [];
    } catch (error) {
        console.error('Error fetching notifications:', error);
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
        console.error('Error marking notification as read:', error);
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
        console.error('Error deleting notification:', error);
        return false;
    }
}

/**
 * Get unread notification count
 */
export function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.readAt).length;
}
