/**
 * Procurement Requests API Service
 * Real backend integration for procurement request operations
 */
import { getApiUrl } from '../config/api';
import { getAuthHeadersSync } from '../utils/api';

export interface RequestItem {
    id?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
}

export interface Request {
    id: string;
    title: string;
    description?: string;
    department: string;
    requestedBy: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    submittedAt?: string;
    items: RequestItem[];
    statusHistory?: Array<{
        status: string;
        date: string;
        actor: string;
        note: string;
    }>;
    attachments?: Array<{
        id: number;
        filename: string;
        url: string;
    }>;
    currentAssignee?: {
        id: number;
        name: string;
        email: string;
    } | null;
}

export interface CreateRequestInput {
    title: string;
    description?: string;
    items: RequestItem[];
    fundingSource?: string;
    budgetCode?: string;
    departmentId?: number;
}

/**
 * Fetch all requests (filtered by user role/permissions on backend)
 */
export async function fetchRequests(): Promise<Request[]> {
    try {
        const url = import.meta.env.DEV ? '/api/requests' : getApiUrl('/api/requests');
        const response = await fetch(url, {
            headers: getAuthHeadersSync(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch requests: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching requests:', error);
        throw error;
    }
}

/**
 * Get request by ID
 */
export async function getRequestById(id: string): Promise<Request | null> {
    try {
        const url = import.meta.env.DEV ? `/api/requests/${id}` : getApiUrl(`/api/requests/${id}`);
        const response = await fetch(url, {
            headers: getAuthHeadersSync(),
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch request: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching request:', error);
        throw error;
    }
}

/**
 * Create new request
 */
export async function createRequest(input: CreateRequestInput): Promise<Request> {
    try {
        const url = import.meta.env.DEV ? '/api/requests' : getApiUrl('/api/requests');
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeadersSync(),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'Failed to create request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating request:', error);
        throw error;
    }
}

/**
 * Update existing request
 */
export async function updateRequest(id: string, input: Partial<CreateRequestInput>): Promise<Request> {
    try {
        const url = import.meta.env.DEV ? `/api/requests/${id}` : getApiUrl(`/api/requests/${id}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: getAuthHeadersSync(),
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'Failed to update request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating request:', error);
        throw error;
    }
}

/**
 * Submit request for approval
 */
export async function submitRequest(id: string): Promise<Request> {
    try {
        const url = import.meta.env.DEV ? `/api/requests/${id}/submit` : getApiUrl(`/api/requests/${id}/submit`);
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeadersSync(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'Failed to submit request');
        }

        return await response.json();
    } catch (error) {
        console.error('Error submitting request:', error);
        throw error;
    }
}

/**
 * Approve or reject request
 */
export async function performAction(id: string, action: 'approve' | 'reject', notes?: string): Promise<Request> {
    try {
        const url = import.meta.env.DEV ? `/api/requests/${id}/action` : getApiUrl(`/api/requests/${id}/action`);
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeadersSync(),
            body: JSON.stringify({ action, notes }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'Failed to perform action');
        }

        return await response.json();
    } catch (error) {
        console.error('Error performing action:', error);
        throw error;
    }
}

/**
 * Get PDF for request
 */
export async function getRequestPdf(id: string): Promise<Blob> {
    try {
        const url = import.meta.env.DEV ? `/api/requests/${id}/pdf` : getApiUrl(`/api/requests/${id}/pdf`);
        const response = await fetch(url, {
            headers: getAuthHeadersSync(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('Error fetching PDF:', error);
        throw error;
    }
}
