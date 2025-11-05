/**
 * requestUtils - Domain utilities for procurement requests
 *
 * Purpose:
 * - Centralize common helpers used across Requests list and Request form
 * - Keep code DRY and typed
 */

import { Request, RequestItem } from '../types/request.types';

/**
 * Format a number as currency using Intl API
 */
export const formatCurrency = (amount: number, currency = 'USD', locale = 'en-US'): string => {
	if (!isFinite(amount)) return '$0.00';
	try {
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
	} catch {
		// Fallback
		return `$${amount.toFixed(2)}`;
	}
};

/**
 * Calculate the total estimated cost from items
 */
export const calculateTotalEstimated = (items: RequestItem[]): number => {
	return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice || 0)), 0);
};

/**
 * Basic email validation
 */
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string): boolean => emailRegex.test(email);

/**
 * Format a file size in B/KB/MB
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Format a date string for display
 */
export const formatDate = (
	dateStr: string,
	locale = 'en-US',
	options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' }
): string => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr; // fallback to raw if invalid
	return new Intl.DateTimeFormat(locale, options).format(d);
};

/**
 * Safely parse localStorage JSON value
 */
export const getLocalStorageJSON = <T = any>(key: string): T | null => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
};

/**
 * Normalize status casing (e.g., convert to Title Case)
 */
export const normalizeStatus = (status: string): string => {
	if (!status) return status;
	return status
		.toLowerCase()
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(' ');
};

/**
 * Search requests by several fields
 */
export const searchRequests = (requests: Request[], query: string): Request[] => {
	const q = query.trim().toLowerCase();
	if (!q) return requests;
	return requests.filter((r) =>
		r.id.toLowerCase().includes(q) ||
		r.title.toLowerCase().includes(q) ||
		r.requester.toLowerCase().includes(q) ||
		r.department.toLowerCase().includes(q)
	);
};

/**
 * Apply status/department filters
 */
export const filterRequests = (
	requests: Request[],
	opts: { status?: string; department?: string }
): Request[] => {
	const { status, department } = opts;
	return requests.filter((r) =>
		(!status || r.status === status) &&
		(!department || r.department === department)
	);
};

/**
 * Limit results to current user
 */
export const onlyMine = (requests: Request[], currentUserName?: string): Request[] => {
	if (!currentUserName) return requests;
	return requests.filter((r) => r.requester === currentUserName);
};

/**
 * Simple client-side pagination
 */
export const paginate = <T,>(data: T[], page: number, pageSize: number): T[] => {
	const start = Math.max(0, (page - 1) * pageSize);
	return data.slice(start, start + pageSize);
};

/**
 * Sort requests by date descending (newest first). Falls back gracefully if date is invalid.
 */
export const sortRequestsByDateDesc = (requests: Request[]): Request[] => {
	return [...requests].sort((a, b) => {
		const ta = new Date(a.date).getTime();
		const tb = new Date(b.date).getTime();
		if (isNaN(ta) && isNaN(tb)) return 0;
		if (isNaN(ta)) return 1;
		if (isNaN(tb)) return -1;
		return tb - ta;
	});
};

