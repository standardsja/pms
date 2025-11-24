/**
 * Message API Service
 * Handles all message-related API calls
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
            console.error('Messages API returned non-JSON response:', response.status, response.statusText);
            return [];
        }

        const result = await response.json();

        if (result.success) {
            return result.data;
        }
        console.error('Failed to fetch messages:', result.message);
        return [];
    } catch (error) {
        console.error('Error fetching messages:', error);
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
