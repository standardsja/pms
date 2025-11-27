import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoadBalancingConfig {
    enabled: boolean;
    strategy: 'AI_SMART' | 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM' | 'SKILL_BASED' | 'PREDICTIVE';
    autoAssignOnApproval: boolean;
    aiEnabled?: boolean;
    learningEnabled?: boolean;
    priorityWeighting?: number;
    performanceWeighting?: number;
    workloadWeighting?: number;
    specialtyWeighting?: number;
    minConfidenceScore?: number;
}

export interface OfficerScore {
    officerId: number;
    officerName: string;
    totalScore: number;
    workloadScore: number;
    performanceScore: number;
    specialtyScore: number;
    availabilityScore: number;
    confidenceScore: number;
    predictedCompletionTime: number; // hours
    currentWorkload: number;
    reasoning: string[];
}

export interface RequestComplexity {
    score: number; // 0-1
    factors: {
        itemCount: number;
        totalValue: number;
        urgency: string;
        categoryComplexity: number;
    };
}

/**
 * AI-POWERED SMART LOAD BALANCING SERVICE
 *
 * Features:
 * - Machine learning-based assignment predictions
 * - Real-time performance tracking and adaptation
 * - Skill-based routing with category expertise
 * - Workload prediction and balancing
 * - Time-of-day optimization
 * - Continuous learning from assignment outcomes
 */

/**
 * Get current load balancing settings with AI parameters
 */
export async function getSettings(): Promise<LoadBalancingConfig> {
    const settings = await prisma.loadBalancingSettings.findFirst({
        orderBy: { id: 'desc' },
    });

    if (!settings) {
        return {
            enabled: false,
            strategy: 'AI_SMART',
            autoAssignOnApproval: true,
            aiEnabled: true,
            learningEnabled: true,
            priorityWeighting: 1.0,
            performanceWeighting: 1.5,
            workloadWeighting: 1.2,
            specialtyWeighting: 1.3,
            minConfidenceScore: 0.6,
        };
    }

    return {
        enabled: settings.enabled,
        strategy: settings.strategy as any,
        autoAssignOnApproval: settings.autoAssignOnApproval,
        aiEnabled: settings.aiEnabled,
        learningEnabled: settings.learningEnabled,
        priorityWeighting: settings.priorityWeighting,
        performanceWeighting: settings.performanceWeighting,
        workloadWeighting: settings.workloadWeighting,
        specialtyWeighting: settings.specialtyWeighting,
        minConfidenceScore: settings.minConfidenceScore,
    };
}

/**
 * Update load balancing settings
 */
export async function updateSettings(config: LoadBalancingConfig): Promise<LoadBalancingConfig> {
    await prisma.loadBalancingSettings.deleteMany({});

    const settings = await prisma.loadBalancingSettings.create({
        data: {
            enabled: config.enabled,
            strategy: config.strategy,
            autoAssignOnApproval: config.autoAssignOnApproval,
            aiEnabled: config.aiEnabled ?? true,
            learningEnabled: config.learningEnabled ?? true,
            priorityWeighting: config.priorityWeighting ?? 1.0,
            performanceWeighting: config.performanceWeighting ?? 1.5,
            workloadWeighting: config.workloadWeighting ?? 1.2,
            specialtyWeighting: config.specialtyWeighting ?? 1.3,
            minConfidenceScore: config.minConfidenceScore ?? 0.6,
            lastRoundRobinIndex: 0,
        },
    });

    return {
        enabled: settings.enabled,
        strategy: settings.strategy as any,
        autoAssignOnApproval: settings.autoAssignOnApproval,
        aiEnabled: settings.aiEnabled,
        learningEnabled: settings.learningEnabled,
        priorityWeighting: settings.priorityWeighting,
        performanceWeighting: settings.performanceWeighting,
        workloadWeighting: settings.workloadWeighting,
        specialtyWeighting: settings.specialtyWeighting,
        minConfidenceScore: settings.minConfidenceScore,
    };
}

/**
 * Initialize or get performance metrics for an officer
 */
async function getOrCreatePerformanceMetrics(officerId: number) {
    let metrics = await prisma.officerPerformanceMetrics.findUnique({
        where: { officerId },
    });

    if (!metrics) {
        metrics = await prisma.officerPerformanceMetrics.create({
            data: {
                officerId,
                totalAssignments: 0,
                completedAssignments: 0,
                averageCompletionTime: 24, // default 24 hours
                successRate: 0.9,
                currentWorkload: 0,
                categoryExpertise: {},
                averageResponseTime: 2,
                qualityScore: 0.8,
                efficiencyScore: 0.8,
                complexityHandling: 0.5,
                peakPerformanceHours: [9, 10, 11, 14, 15],
            },
        });
    }

    return metrics;
}

/**
 * Get all procurement officers with their current metrics
 */
async function getProcurementOfficers() {
    const procurementRole = await prisma.role.findFirst({
        where: { name: 'PROCUREMENT' },
    });

    if (!procurementRole) {
        return [];
    }

    const userRoles = await prisma.userRole.findMany({
        where: { roleId: procurementRole.id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return userRoles.map((ur) => ur.user);
}

/**
 * Calculate request complexity using AI analysis
 */
async function analyzeRequestComplexity(requestId: number): Promise<RequestComplexity> {
    const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: {
            items: true,
        },
    });

    if (!request) {
        return { score: 0.5, factors: { itemCount: 0, totalValue: 0, urgency: 'MEDIUM', categoryComplexity: 0.5 } };
    }

    // Factor 1: Item count complexity (more items = more complex)
    const itemCount = request.items.length;
    const itemComplexity = Math.min(itemCount / 10, 1); // normalize to 0-1

    // Factor 2: Total value complexity (higher value = more complex)
    const totalValue = request.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const valueComplexity = totalValue > 100000 ? 0.9 : totalValue > 50000 ? 0.7 : totalValue > 10000 ? 0.5 : 0.3;

    // Factor 3: Priority urgency
    const urgency = request.priority || 'MEDIUM';
    const urgencyComplexity = urgency === 'URGENT' ? 0.9 : urgency === 'HIGH' ? 0.7 : 0.5;

    // Factor 4: Category diversity (different types of items)
    const categoryComplexity = itemCount > 5 ? 0.8 : itemCount > 2 ? 0.6 : 0.4;

    // Weighted combination
    const complexityScore = itemComplexity * 0.25 + valueComplexity * 0.35 + urgencyComplexity * 0.25 + categoryComplexity * 0.15;

    return {
        score: Math.min(complexityScore, 1),
        factors: {
            itemCount,
            totalValue,
            urgency,
            categoryComplexity,
        },
    };
}

/**
 * Calculate category expertise match for an officer
 */
function calculateCategoryMatch(requestCategory: string, officerExpertise: any): number {
    if (!officerExpertise || typeof officerExpertise !== 'object') {
        return 0.5; // default neutral score
    }

    // Exact match
    if (officerExpertise[requestCategory]) {
        return Number(officerExpertise[requestCategory]);
    }

    // Partial match (e.g., "IT Equipment" matches "IT")
    for (const [cat, score] of Object.entries(officerExpertise)) {
        if (requestCategory.includes(cat) || cat.includes(requestCategory)) {
            return Number(score) * 0.8; // slightly lower for partial match
        }
    }

    return 0.5; // no match, neutral score
}

/**
 * Check if current time is within officer's peak performance hours
 */
function isPeakPerformanceTime(peakHours: any): number {
    const currentHour = new Date().getHours();

    if (!Array.isArray(peakHours) || peakHours.length === 0) {
        return 0.8; // default if no data
    }

    const isPeak = peakHours.includes(currentHour);
    return isPeak ? 1.0 : 0.7; // boost if in peak hours
}

/**
 * AI-SMART STRATEGY: Machine Learning-Based Assignment
 *
 * Uses multiple factors to calculate the best officer:
 * 1. Current workload (prefer less loaded)
 * 2. Historical performance (success rate, completion time)
 * 3. Category expertise (skill matching)
 * 4. Availability (recent assignments, time of day)
 * 5. Complexity handling capability
 * 6. Quality and efficiency scores
 */
async function selectAISmart(requestId: number, config: LoadBalancingConfig): Promise<OfficerScore | null> {
    const officers = await getProcurementOfficers();

    if (officers.length === 0) {
        return null;
    }

    // Analyze request complexity
    const complexity = await analyzeRequestComplexity(requestId);

    // Get request details for category matching
    const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { items: true },
    });

    // Score each officer
    const scoredOfficers: OfficerScore[] = await Promise.all(
        officers.map(async (officer) => {
            const metrics = await getOrCreatePerformanceMetrics(officer.id);
            const reasoning: string[] = [];

            // 1. WORKLOAD SCORE (inverse - lower workload = higher score)
            const currentWorkload = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
                },
            });

            const maxWorkload = 20; // assume max capacity
            const workloadScore = Math.max(0, (maxWorkload - currentWorkload) / maxWorkload);
            reasoning.push(`Workload: ${currentWorkload}/${maxWorkload} requests (${(workloadScore * 100).toFixed(0)}%)`);

            // 2. PERFORMANCE SCORE (success rate + efficiency)
            const performanceScore = metrics.successRate * 0.6 + metrics.efficiencyScore * 0.4;
            reasoning.push(`Performance: ${(performanceScore * 100).toFixed(0)}% (success: ${(metrics.successRate * 100).toFixed(0)}%, efficiency: ${(metrics.efficiencyScore * 100).toFixed(0)}%)`);

            // 3. SPECIALTY/EXPERTISE SCORE
            const primaryCategory = request?.items[0]?.description || 'General';
            const categoryMatch = calculateCategoryMatch(primaryCategory, metrics.categoryExpertise);
            reasoning.push(`Category expertise: ${(categoryMatch * 100).toFixed(0)}% match for "${primaryCategory}"`);

            // 4. AVAILABILITY SCORE (time-based)
            const peakTimeBonus = isPeakPerformanceTime(metrics.peakPerformanceHours);
            const lastAssigned = metrics.lastAssignedAt ? (Date.now() - metrics.lastAssignedAt.getTime()) / (1000 * 60 * 60) : 999;
            const freshnessScore = Math.min(lastAssigned / 24, 1); // prefer officers not assigned recently
            const availabilityScore = peakTimeBonus * 0.6 + freshnessScore * 0.4;
            reasoning.push(`Availability: ${(availabilityScore * 100).toFixed(0)}% (peak time: ${peakTimeBonus === 1.0 ? 'Yes' : 'No'}, last assigned: ${lastAssigned.toFixed(1)}h ago)`);

            // 5. COMPLEXITY HANDLING (can this officer handle this request?)
            const complexityFit = 1 - Math.abs(complexity.score - metrics.complexityHandling);
            reasoning.push(
                `Complexity fit: ${(complexityFit * 100).toFixed(0)}% (request: ${(complexity.score * 100).toFixed(0)}%, officer capability: ${(metrics.complexityHandling * 100).toFixed(0)}%)`
            );

            // 6. RESPONSE TIME PREDICTION
            const predictedCompletionTime = metrics.averageCompletionTime * (1 + complexity.score * 0.5);
            reasoning.push(`Predicted completion: ${predictedCompletionTime.toFixed(1)} hours`);

            // WEIGHTED TOTAL SCORE
            const weights = {
                workload: config.workloadWeighting || 1.2,
                performance: config.performanceWeighting || 1.5,
                specialty: config.specialtyWeighting || 1.3,
                availability: 1.0,
                complexity: 1.1,
            };

            const totalScore =
                (workloadScore * weights.workload +
                    performanceScore * weights.performance +
                    categoryMatch * weights.specialty +
                    availabilityScore * weights.availability +
                    complexityFit * weights.complexity) /
                (weights.workload + weights.performance + weights.specialty + weights.availability + weights.complexity);

            // Calculate confidence (higher score = higher confidence)
            const confidenceScore = Math.min(totalScore + 0.2, 1.0);

            return {
                officerId: officer.id,
                officerName: officer.name || 'Unknown',
                totalScore,
                workloadScore,
                performanceScore,
                specialtyScore: categoryMatch,
                availabilityScore,
                confidenceScore,
                predictedCompletionTime,
                currentWorkload,
                reasoning,
            };
        })
    );

    // Sort by total score descending
    scoredOfficers.sort((a, b) => b.totalScore - a.totalScore);

    const bestOfficer = scoredOfficers[0];

    console.log('🤖 AI-SMART Assignment Analysis:');
    console.log(`Top 3 candidates for Request ${requestId}:`);
    scoredOfficers.slice(0, 3).forEach((officer, idx) => {
        console.log(`  ${idx + 1}. ${officer.officerName} - Score: ${(officer.totalScore * 100).toFixed(1)}%, Confidence: ${(officer.confidenceScore * 100).toFixed(0)}%`);
        officer.reasoning.forEach((r) => console.log(`     - ${r}`));
    });

    return bestOfficer;
}

/**
 * SKILL-BASED STRATEGY: Match officers by expertise
 */
async function selectSkillBased(requestId: number): Promise<number | null> {
    const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { items: true },
    });

    if (!request) return null;

    const officers = await getProcurementOfficers();
    if (officers.length === 0) return null;

    const primaryCategory = request.items[0]?.description || 'General';

    const scoredOfficers = await Promise.all(
        officers.map(async (officer) => {
            const metrics = await getOrCreatePerformanceMetrics(officer.id);
            const categoryScore = calculateCategoryMatch(primaryCategory, metrics.categoryExpertise);

            const workload = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
                },
            });

            return {
                officer,
                score: categoryScore * 0.7 + (1 - workload / 20) * 0.3,
            };
        })
    );

    scoredOfficers.sort((a, b) => b.score - a.score);
    return scoredOfficers[0].officer.id;
}

/**
 * PREDICTIVE STRATEGY: Use historical data to predict best outcome
 */
async function selectPredictive(requestId: number): Promise<number | null> {
    const complexity = await analyzeRequestComplexity(requestId);
    const officers = await getProcurementOfficers();

    if (officers.length === 0) return null;

    // Find officer with best historical performance on similar complexity
    const predictions = await Promise.all(
        officers.map(async (officer) => {
            const metrics = await getOrCreatePerformanceMetrics(officer.id);

            // Predict success probability based on complexity match
            const complexityMatch = 1 - Math.abs(complexity.score - metrics.complexityHandling);
            const successProbability = metrics.successRate * complexityMatch * metrics.efficiencyScore;

            const workload = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
                },
            });

            const workloadPenalty = Math.max(0, 1 - workload / 20);
            const finalScore = successProbability * 0.7 + workloadPenalty * 0.3;

            return { officer, score: finalScore };
        })
    );

    predictions.sort((a, b) => b.score - a.score);
    return predictions[0].officer.id;
}

/**
 * LEGACY STRATEGIES (maintained for compatibility)
 */

async function selectLeastLoaded(): Promise<number | null> {
    const officers = await getProcurementOfficers();
    if (officers.length === 0) return null;

    const workloads = await Promise.all(
        officers.map(async (officer) => {
            const count = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
                },
            });
            return { officer, count };
        })
    );

    workloads.sort((a, b) => a.count - b.count || a.officer.id - b.officer.id);
    return workloads[0].officer.id;
}

async function selectRoundRobin(): Promise<number | null> {
    const officers = await getProcurementOfficers();
    if (officers.length === 0) return null;

    officers.sort((a, b) => a.id - b.id);

    const settings = await prisma.loadBalancingSettings.findFirst({
        orderBy: { id: 'desc' },
    });

    const currentIndex = settings?.lastRoundRobinIndex || 0;
    const nextIndex = (currentIndex + 1) % officers.length;

    if (settings) {
        await prisma.loadBalancingSettings.update({
            where: { id: settings.id },
            data: { lastRoundRobinIndex: nextIndex },
        });
    }

    return officers[nextIndex].id;
}

async function selectRandom(): Promise<number | null> {
    const officers = await getProcurementOfficers();
    if (officers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * officers.length);
    return officers[randomIndex].id;
}

/**
 * Master officer selection using configured strategy
 */
export async function selectOfficer(
    strategy: LoadBalancingConfig['strategy'],
    requestId: number,
    config: LoadBalancingConfig
): Promise<{ officerId: number; confidence: number; predictedTime?: number } | null> {
    try {
        let officerId: number | null = null;
        let confidence = 0.7;
        let predictedTime: number | undefined;

        switch (strategy) {
            case 'AI_SMART': {
                const result = await selectAISmart(requestId, config);
                if (result) {
                    officerId = result.officerId;
                    confidence = result.confidenceScore;
                    predictedTime = result.predictedCompletionTime;
                }
                break;
            }
            case 'SKILL_BASED':
                officerId = await selectSkillBased(requestId);
                confidence = 0.75;
                break;
            case 'PREDICTIVE':
                officerId = await selectPredictive(requestId);
                confidence = 0.8;
                break;
            case 'LEAST_LOADED':
                officerId = await selectLeastLoaded();
                confidence = 0.65;
                break;
            case 'ROUND_ROBIN':
                officerId = await selectRoundRobin();
                confidence = 0.6;
                break;
            case 'RANDOM':
                officerId = await selectRandom();
                confidence = 0.5;
                break;
            default:
                const aiSmartResult = await selectAISmart(requestId, config);
                officerId = aiSmartResult ? aiSmartResult.officerId : null;
                confidence = aiSmartResult ? aiSmartResult.confidenceScore : 0.7;
                predictedTime = aiSmartResult ? aiSmartResult.predictedCompletionTime : undefined;
        }

        if (!officerId) return null;

        // Check confidence threshold
        if (confidence < (config.minConfidenceScore || 0.6)) {
            console.warn(`⚠️ Assignment confidence (${(confidence * 100).toFixed(0)}%) below threshold (${((config.minConfidenceScore || 0.6) * 100).toFixed(0)}%)`);
        }

        return { officerId, confidence, predictedTime };
    } catch (error) {
        console.error('Error in selectOfficer:', error);
        return null;
    }
}

/**
 * Auto-assign request with AI and logging
 */
export async function autoAssignRequest(requestId: number, triggeredById: number): Promise<boolean> {
    try {
        const settings = await getSettings();

        if (!settings.enabled) {
            console.log(`Auto-assignment disabled for request ${requestId}`);
            return false;
        }

        const selection = await selectOfficer(settings.strategy, requestId, settings);

        if (!selection) {
            console.error(`No procurement officers available for request ${requestId}`);
            return false;
        }

        const { officerId, confidence, predictedTime } = selection;

        const officer = await prisma.user.findUnique({
            where: { id: officerId },
            select: { name: true },
        });

        // Update request
        await prisma.request.update({
            where: { id: requestId },
            data: {
                currentAssigneeId: officerId,
                statusHistory: {
                    create: {
                        status: 'PROCUREMENT_REVIEW',
                        changedById: triggeredById,
                        comment: `🤖 AI auto-assigned to ${officer?.name || 'officer'} using ${settings.strategy} (confidence: ${(confidence * 100).toFixed(0)}%)`,
                    },
                },
            },
        });

        // Log assignment for learning
        await prisma.requestAssignmentLog.create({
            data: {
                requestId,
                officerId,
                strategy: settings.strategy,
                confidenceScore: confidence,
                predictedCompletionTime: predictedTime,
            },
        });

        // Update officer metrics
        await updateOfficerWorkload(officerId);

        console.log(`✅ Request ${requestId} auto-assigned to officer ${officerId} using ${settings.strategy} (confidence: ${(confidence * 100).toFixed(0)}%)`);
        return true;
    } catch (error) {
        console.error(`Auto-assignment failed for request ${requestId}:`, error);
        return false;
    }
}

/**
 * Update officer workload count
 */
async function updateOfficerWorkload(officerId: number) {
    const currentWorkload = await prisma.request.count({
        where: {
            currentAssigneeId: officerId,
            status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
        },
    });

    await prisma.officerPerformanceMetrics.upsert({
        where: { officerId },
        create: {
            officerId,
            currentWorkload,
            totalAssignments: 1,
        },
        update: {
            currentWorkload,
            totalAssignments: { increment: 1 },
            lastAssignedAt: new Date(),
        },
    });
}

/**
 * Learn from completed assignment (called when request is completed)
 */
export async function learnFromAssignment(requestId: number, wasSuccessful: boolean, feedbackScore?: number) {
    try {
        const settings = await getSettings();
        if (!settings.learningEnabled) return;

        const log = await prisma.requestAssignmentLog.findFirst({
            where: { requestId },
            orderBy: { assignedAt: 'desc' },
        });

        if (!log) return;

        const completedAt = new Date();
        const actualCompletionTime = (completedAt.getTime() - log.assignedAt.getTime()) / (1000 * 60 * 60); // hours

        // Update log
        await prisma.requestAssignmentLog.update({
            where: { id: log.id },
            data: {
                completedAt,
                actualCompletionTime,
                wasSuccessful,
                feedbackScore,
            },
        });

        // Update officer metrics
        const metrics = await getOrCreatePerformanceMetrics(log.officerId);

        const newCompletedCount = metrics.completedAssignments + 1;
        const newSuccessRate = (metrics.successRate * metrics.completedAssignments + (wasSuccessful ? 1 : 0)) / newCompletedCount;
        const newAvgCompletionTime = (metrics.averageCompletionTime * metrics.completedAssignments + actualCompletionTime) / newCompletedCount;

        await prisma.officerPerformanceMetrics.update({
            where: { officerId: log.officerId },
            data: {
                completedAssignments: newCompletedCount,
                successRate: newSuccessRate,
                averageCompletionTime: newAvgCompletionTime,
                lastPerformanceUpdate: new Date(),
            },
        });

        console.log(`📚 Learning: Officer ${log.officerId} completed request ${requestId} in ${actualCompletionTime.toFixed(1)}h (success: ${wasSuccessful})`);
    } catch (error) {
        console.error('Error learning from assignment:', error);
    }
}

/**
 * Get AI analytics and insights
 */
export async function getAIAnalytics() {
    const [totalLogs, avgConfidence, topOfficers, strategyStats] = await Promise.all([
        prisma.requestAssignmentLog.count(),
        prisma.requestAssignmentLog.aggregate({
            _avg: { confidenceScore: true },
        }),
        prisma.officerPerformanceMetrics.findMany({
            take: 5,
            orderBy: { successRate: 'desc' },
            include: { officer: { select: { id: true, name: true, email: true } } },
        }),
        prisma.requestAssignmentLog.groupBy({
            by: ['strategy'],
            _count: { id: true },
            _avg: { confidenceScore: true },
        }),
    ]);

    return {
        totalAssignments: totalLogs,
        averageConfidence: avgConfidence._avg.confidenceScore || 0,
        topPerformers: topOfficers.map((m) => ({
            officer: m.officer,
            successRate: m.successRate,
            avgCompletionTime: m.averageCompletionTime,
            totalAssignments: m.totalAssignments,
            efficiencyScore: m.efficiencyScore,
        })),
        strategyPerformance: strategyStats.map((s) => ({
            strategy: s.strategy,
            count: s._count.id,
            avgConfidence: s._avg.confidenceScore || 0,
        })),
    };
}

/**
 * Auto-assign pending requests
 */
export async function autoAssignPendingRequests(triggeredById: number): Promise<number> {
    try {
        const settings = await getSettings();

        if (!settings.enabled) {
            return 0;
        }

        const pendingRequests = await prisma.request.findMany({
            where: {
                status: 'PROCUREMENT_REVIEW',
                currentAssigneeId: null,
            },
            select: { id: true },
        });

        let assignedCount = 0;

        for (const request of pendingRequests) {
            const success = await autoAssignRequest(request.id, triggeredById);
            if (success) {
                assignedCount++;
            }
        }

        console.log(`✅ Auto-assigned ${assignedCount} pending requests`);
        return assignedCount;
    } catch (error) {
        console.error('Error auto-assigning pending requests:', error);
        return 0;
    }
}
