import { PrismaClient } from '@prisma/client';

export type SplinterCheckParams = {
    requesterId?: number | null;
    departmentId?: number | null;
    total: number;
    windowDays?: number; // lookback window in days
    threshold?: number; // currency amount threshold
};

export async function checkSplintering(prisma: PrismaClient, params: SplinterCheckParams) {
    const windowDays = params.windowDays ?? Number(process.env.SPLINTER_WINDOW_DAYS || 30);
    const threshold = params.threshold ?? Number(process.env.SPLINTER_THRESHOLD_JMD || 250000);

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    // Build query: previous requests within window for same requester OR same department
    // Consider only active or approved pipeline states that represent legitimate spend activity.
    // Exclude terminal negatives like REJECTED and CLOSED to reduce false positives.
    const validStatuses = [
        'SUBMITTED',
        'DEPARTMENT_REVIEW',
        'DEPARTMENT_APPROVED',
        'EXECUTIVE_REVIEW',
        'HOD_REVIEW',
        'FINANCE_REVIEW',
        'BUDGET_MANAGER_REVIEW',
        'PROCUREMENT_REVIEW',
        'FINANCE_APPROVED',
        'SENT_TO_VENDOR',
    ];

    const where: any = {
        createdAt: { gte: windowStart },
        status: { in: validStatuses },
    };

    // If requesterId provided, prefer requester grouping; also include department grouping
    const orConditions: any[] = [];
    if (params.requesterId) orConditions.push({ requesterId: Number(params.requesterId) });
    if (params.departmentId) orConditions.push({ departmentId: Number(params.departmentId) });
    if (orConditions.length > 0) where.OR = orConditions;

    const matches = await prisma.request.findMany({ where, select: { id: true, totalEstimated: true, createdAt: true, requesterId: true, departmentId: true, reference: true, status: true } });

    const sumPrior = matches.reduce((s, m) => s + Number(m.totalEstimated || 0), 0);
    const combined = sumPrior + Number(params.total || 0);

    const flagged = combined >= threshold;

    return {
        flagged,
        threshold,
        windowDays,
        sumPrior,
        combined,
        matches,
    };
}

export default checkSplintering;
