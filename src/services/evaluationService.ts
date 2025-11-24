import { getToken } from '../utils/auth';

/**
 * Smart API URL detection - automatically switches between local and production
 */
function getApiUrl(): string {
    // 1. Explicit override via environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Detect environment based on current hostname
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // If running on localhost or heron, use appropriate backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000';
    }
    if (hostname === 'heron') {
        return 'http://heron:4000';
    }

    // Otherwise, use the same hostname as the frontend (production)
    return `${protocol}//${hostname}:4000`;
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
        ppcCategory: string;
        tciTrn: string;
        bidAmountInclusiveGCT: number;
        complianceMatrix: {
            signedLetterOfQuotation: boolean;
            signedPriceSchedules: boolean;
            signedStatementOfCompliance: boolean;
            bidValidity30Days: boolean;
            quotationProvided: boolean;
            bidAmountMatches: boolean;
        };
        technicalEvaluation?: Array<{
            specifications: string;
            quantity: number;
            bidAmount: number;
        }>;
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
    status: EvaluationStatus;

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
    sectionA?: SectionA;
    evaluator?: string;
    dueDate?: string;
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
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
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

    async deleteEvaluation(id: number): Promise<void> {
        await this.fetchWithAuth(`/api/evaluations/${id}`, {
            method: 'DELETE',
        });
    }
}

export const evaluationService = new EvaluationService();
