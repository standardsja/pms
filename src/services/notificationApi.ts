/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import { getToken, getUser } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://heron:4000';

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
