/**
 * Message API Service
 * Handles all message-related API calls
 */

import { getToken, getUser } from '../utils/auth';
import { getApiBaseUrl } from '../config/api';

// Get API URL from centralized configuration
const getApiUrl = () => {
    return getApiBaseUrl();
};

const API_URL = getApiUrl();

export interface Message {
    id: number;
    fromUserId: number;
    toUserId: number;
    subject: string;
    body: string;
    readAt: string | null;
    createdAt: string;
    fromUser?: {
        id: number;
        name: string;
        email: string;
    };
    toUser?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface MessageResponse {
    success: boolean;
    data: Message[];
    message?: string;
}

function authHeaders(): Record<string, string> {
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
 * Fetch all messages for the current user
 */
export async function fetchMessages(): Promise<Message[]> {
    try {
        const response = await fetch(`${API_URL}/api/messages`, {
            headers: authHeaders(),
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Silently return empty array for non-JSON responses (server might be down)
            return [];
        }

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
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: number): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/messages/${messageId}/read`, {
            method: 'PATCH',
            headers: authHeaders(),
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Error marking message as read:', error);
        return false;
    }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: number): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
}

/**
 * Get unread message count
 */
export function getUnreadCount(messages: Message[]): number {
    return messages.filter((m) => !m.readAt).length;
}
