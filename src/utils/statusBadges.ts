export interface StatusBadge {
    bg: string;
    text: string;
    label: string;
}

export const STATUS_BADGES: Record<string, StatusBadge> = {
    'Pending Finance': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Pending Finance' },
    'Finance Verified': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Finance Verified' },
    'Pending Procurement': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', label: 'Pending Procurement' },
    Approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', label: 'Approved' },
    'Returned by Finance': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', label: 'Returned' },
    Rejected: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', label: 'Rejected' },
    Fulfilled: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Fulfilled' },
    'Executive Review': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', label: 'Executive Review' },
    'Executive Approved': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Executive Approved' },
    default: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: 'Unknown' },
};

export type Status = Exclude<keyof typeof STATUS_BADGES, 'default'>;

import { normalizeStatus } from './requestUtils';

export const getStatusBadge = (status: string): StatusBadge => {
    const key = normalizeStatus(status);
    return STATUS_BADGES[key] || { ...STATUS_BADGES['default'], label: key };
};
