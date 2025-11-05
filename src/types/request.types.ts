// Shared request-related TypeScript interfaces

export interface RequestItem {
	description: string;
	quantity: number;
	unitPrice: number;
}

export interface CommentEntry {
	actor: string;
	date: string; // ISO date string or human-readable date
	text: string;
}

export interface StatusHistoryEntry {
	status: string;
	date: string; // ISO date string or human-readable date
	actor: string;
	note: string;
}

export interface Request {
	id: string;
	title: string;
	requester: string;
	department: string;
	status: string;
	date: string;
	items: RequestItem[];
	totalEstimated: number;
	fundingSource?: string;
	budgetCode?: string;
	justification: string;
	comments: CommentEntry[];
	statusHistory: StatusHistoryEntry[];
}

export interface ApiResponse<T = any> {
	success?: boolean;
	message?: string;
	data?: T;
	errors?: Record<string, string[]>;
}

