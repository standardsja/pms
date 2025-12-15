import { getToken } from '../utils/auth';

/**
 * API URL configuration - uses relative paths in dev, configured URL in production
 */
function getApiUrl(): string {
    // 1. Explicit override via environment variable (ALWAYS takes priority)
    if (import.meta.env.VITE_API_URL) {
        console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
        return import.meta.env.VITE_API_URL;
    }

    // 2. In development, use empty string for relative paths (Vite proxy handles it)
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    if (isDev) {
        return '';
    }

    // 3. Production: use same-origin or fallback to empty (relative URLs)
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return '';
}

const API_URL = getApiUrl();

export type EvaluationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMMITTEE_REVIEW' | 'COMPLETED' | 'VALIDATED' | 'REJECTED';

export type SectionVerificationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'RETURNED' | 'VERIFIED';

export type ProcurementMethod = 'INTERNATIONAL_COMPETITIVE_BIDDING' | 'NATIONAL_COMPETITIVE_BIDDING' | 'RESTRICTED_BIDDING' | 'SINGLE_SOURCE' | 'EMERGENCY_SINGLE_SOURCE';

export type ContractType = 'GOODS' | 'CONSULTING_SERVICES' | 'NON_CONSULTING_SERVICES' | 'WORKS';

export type AwardCriteria = 'LOWEST_COST' | 'MOST_ADVANTAGEOUS_BID';

export type EvaluatorAction = 'RECOMMENDED' | 'REJECTED' | 'DEFERRED';

export interface SectionA {
    comparableEstimate: number;
    fundedBy: string;
    tenderClosingDate: string;
    tenderClosingTime?: string;
    tenderOpeningDate: string;
    tenderOpeningTime?: string;
    actualOpeningDate: string;
    actualOpeningTime?: string;
    procurementMethod: ProcurementMethod;
    advertisementMethods: string[];
    contractType: ContractType;
    bidSecurity: 'Yes' | 'No' | 'N/A';
    tenderPeriodStartDate?: string;
    tenderPeriodEndDate?: string;
    tenderPeriodDays: number;
    bidValidityDays: number;
    bidValidityExpiration: string;
    numberOfBidsRequested: number;
    numberOfBidsReceived: number;
    arithmeticErrorIdentified: boolean;
    retender: boolean;
    retenderReasons?: string[];
    retenderOtherReason?: string;
    awardCriteria: AwardCriteria;
}

export interface SectionB {
    bidders: Array<{
        bidderName: string;
        // Legacy fields (may be omitted when using dynamic tables)
        ppcCategory?: string;
        tciTrn?: string;
        bidAmountInclusiveGCT?: number;
        // New flexible table structures
        eligibilityRequirements?: { columns: Array<{ id: string; name: string }>; rows: Array<{ id: string; data: Record<string, string> }> };
        complianceMatrix?: { columns: Array<{ id: string; name: string }>; rows: Array<{ id: string; data: Record<string, string> }> };
        technicalEvaluation?: { columns: Array<{ id: string; name: string; cellType?: 'text' | 'radio' }>; rows: Array<{ id: string; data: Record<string, string> }> };
    }>;
}

export interface SectionC {
    comments: string;
    criticalIssues: string;
    actionTaken: EvaluatorAction;
    rejectionReason?: string;
    recommendedSupplier: string;
    recommendedAmountInclusiveGCT: number;
    evaluatorName: string;
    evaluatorTitle: string;
    evaluatorSignature?: string;
    evaluationDate: string;
}

export interface SectionD {
    summary: string;
}

export interface SectionE {
    finalRecommendation: string;
    percentageDifference?: number;
    preparedBy: string;
}

export interface Evaluation {
    id: number;
    evalNumber: string;
    rfqNumber: string;
    rfqTitle: string;
    description?: string;
    dateSubmissionConsidered?: string;
    reportCompletionDate?: string;
    status: EvaluationStatus;
    combinedRequestId?: number;
    requestId?: number;

    sectionA?: SectionA;
    sectionAStatus: SectionVerificationStatus;
    sectionAVerifiedBy?: number;
    sectionAVerifier?: { id: number; name: string | null; email: string };
    sectionAVerifiedAt?: string;
    sectionANotes?: string;

    sectionB?: SectionB;
    sectionBStatus: SectionVerificationStatus;
    sectionBVerifiedBy?: number;
    sectionBVerifier?: { id: number; name: string | null; email: string };
    sectionBVerifiedAt?: string;
    sectionBNotes?: string;

    sectionC?: SectionC;
    sectionCStatus: SectionVerificationStatus;
    sectionCVerifiedBy?: number;
    sectionCVerifier?: { id: number; name: string | null; email: string };
    sectionCVerifiedAt?: string;
    sectionCNotes?: string;

    sectionD?: SectionD;
    sectionDStatus: SectionVerificationStatus;
    sectionDVerifiedBy?: number;
    sectionDVerifier?: { id: number; name: string | null; email: string };
    sectionDVerifiedAt?: string;
    sectionDNotes?: string;

    sectionE?: SectionE;
    sectionEStatus: SectionVerificationStatus;
    sectionEVerifiedBy?: number;
    sectionEVerifier?: { id: number; name: string | null; email: string };
    sectionEVerifiedAt?: string;
    sectionENotes?: string;

    createdBy: number;
    creator: {
        id: number;
        name: string | null;
        email: string;
    };
    evaluator?: string;
    dueDate?: string;
    validatedBy?: number;
    validator?: {
        id: number;
        name: string | null;
        email: string;
    };
    validatedAt?: string;
    validationNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEvaluationDTO {
    evalNumber: string;
    rfqNumber: string;
    rfqTitle: string;
    description?: string;
    combinedRequestId?: number; // Link to combined request with lots
    requestId?: number; // Optional link to a single Request (ID)
    sectionA?: SectionA;
    sectionB?: SectionB;
    sectionC?: SectionC;
    sectionD?: SectionD;
    sectionE?: SectionE;
    evaluator?: string;
    dueDate?: string;
    submitToCommittee?: boolean;
}

export interface UpdateEvaluationDTO {
    status?: EvaluationStatus;
    sectionA?: SectionA;
    sectionB?: SectionB;
    sectionC?: SectionC;
    sectionD?: SectionD;
    sectionE?: SectionE;
    validationNotes?: string;
}

export interface EvaluationFilters {
    status?: EvaluationStatus | 'ALL';
    search?: string;
    dueBefore?: string;
    dueAfter?: string;
}

class EvaluationService {
    private async fetchWithAuth(url: string, options: RequestInit = {}) {
        const token = getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Build initial headers
        const baseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };

        // Development fallback: include X-User-Id header if we can derive a numeric id from stored user
        try {
            const rawUser = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
            if (rawUser) {
                const parsed = JSON.parse(rawUser);
                const uid = parsed?.id ?? parsed?.userId;
                const numericId = typeof uid === 'number' ? uid : parseInt(String(uid), 10);
                if (Number.isFinite(numericId)) {
                    baseHeaders['X-User-Id'] = String(numericId);
                }
            }
        } catch {
            /* ignore parse errors */
        }

        const attempt = async (extraHeaders?: Record<string, string>) => {
            const response = await fetch(`${API_URL}${url}`, {
                ...options,
                headers: {
                    ...baseHeaders,
                    ...(options.headers || {}),
                    ...(extraHeaders || {}),
                },
            });
            return response;
        };

        let response = await attempt();

        // If token invalid (401) and we have X-User-Id, try a second attempt without Bearer to leverage dev fallback in backend
        if (response.status === 401) {
            const hasUserIdHeader = 'X-User-Id' in baseHeaders;
            if (hasUserIdHeader) {
                response = await attempt({ Authorization: '' });
            }
        }

        if (!response.ok) {
            // Attempt to parse structured error
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            const errorMessage = error.message || error.error || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    }

    async getEvaluations(filters?: EvaluationFilters): Promise<Evaluation[]> {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.dueBefore) params.append('dueBefore', filters.dueBefore);
        if (filters?.dueAfter) params.append('dueAfter', filters.dueAfter);

        const queryString = params.toString();
        const url = `/api/evaluations${queryString ? `?${queryString}` : ''}`;

        const result = await this.fetchWithAuth(url);
        return result.data;
    }

    async getEvaluationById(id: number): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}`);
        return result.data;
    }

    async createEvaluation(data: CreateEvaluationDTO): Promise<Evaluation> {
        const result = await this.fetchWithAuth('/api/evaluations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return result.data;
    }

    async updateEvaluation(id: number, data: UpdateEvaluationDTO): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return result.data;
    }

    async updateCommitteeSection(id: number, section: 'A' | 'B' | 'C' | 'D' | 'E', data: any): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/committee`, {
            method: 'PATCH',
            body: JSON.stringify({ section, data }),
        });
        return result.data;
    }

    async submitSection(id: number, section: 'A' | 'B' | 'C' | 'D' | 'E'): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/sections/${section}/submit`, {
            method: 'POST',
        });
        return result.data;
    }

    async updateSection(id: number, section: 'A' | 'B' | 'C' | 'D' | 'E', data: any): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/sections/${section}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return result.data;
    }

    async verifySection(id: number, section: 'A' | 'B' | 'C' | 'D' | 'E', notes?: string): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/sections/${section}/verify`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
        return result.data;
    }

    async returnSection(id: number, section: 'A' | 'B' | 'C' | 'D' | 'E', notes: string): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/sections/${section}/return`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
        return result.data;
    }

    async validateEvaluation(id: number, notes?: string): Promise<Evaluation> {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/validate`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
        return result.data;
    }

    async deleteEvaluation(id: number): Promise<void> {
        await this.fetchWithAuth(`/api/evaluations/${id}`, {
            method: 'DELETE',
        });
    }

    async assignEvaluators(id: number, payload: { userIds: number[]; sections?: Array<'A' | 'B' | 'C' | 'D' | 'E'> }) {
        const result = await this.fetchWithAuth(`/api/evaluations/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return result.data;
    }

    async getMyAssignments(): Promise<Array<{ id: number; evaluationId: number; userId: number; sections: string[]; status: string; createdAt: string }>> {
        const result = await this.fetchWithAuth('/api/evaluations/assignments/me');
        return result.data;
    }

    async getAllAssignments(evaluationId: number): Promise<Array<{ id: number; evaluationId: number; userId: number; user?: any; sections: string[]; status: string; createdAt: string }>> {
        const result = await this.fetchWithAuth(`/api/evaluations/${evaluationId}/assignments`);
        return result.data;
    }

    async removeAssignment(assignmentId: number) {
        await this.fetchWithAuth(`/api/evaluations/assignments/${assignmentId}`, {
            method: 'DELETE',
        });
    }

    async completeAssignment(evaluationId: number) {
        const result = await this.fetchWithAuth(`/api/evaluations/${evaluationId}/assignments/complete`, {
            method: 'POST',
        });
        return result;
    }
}

export const evaluationService = new EvaluationService();
