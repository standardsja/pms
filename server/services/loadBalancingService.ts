import { PrismaClient, LoadBalancingStrategy } from '@prisma/client';

/**
 * Load Balancing Service
 *
 * Provides intelligent automatic assignment of procurement requests to officers
 * based on configured strategies: LEAST_LOADED, ROUND_ROBIN, or RANDOM.
 */

export interface LoadBalancingConfig {
    enabled: boolean;
    strategy: LoadBalancingStrategy;
    autoAssignOnApproval: boolean;
    roundRobinCounter: number;
    splinteringEnabled: boolean;
}

/**
 * Get current load balancing settings from database
 */
export async function getLoadBalancingSettings(prisma: PrismaClient | undefined | null): Promise<LoadBalancingConfig | null> {
    if (!prisma || !(prisma as any).loadBalancingSettings) {
        console.warn('[LoadBalancing] Prisma client unavailable when fetching settings');
        return null;
    }
    try {
        const settings = await (prisma as PrismaClient).loadBalancingSettings.findFirst({
            orderBy: { updatedAt: 'desc' },
        });

        if (!settings) {
            return null;
        }

        return {
            enabled: settings.enabled,
            strategy: settings.strategy,
            autoAssignOnApproval: settings.autoAssignOnApproval,
            roundRobinCounter: settings.roundRobinCounter,
            splinteringEnabled: (settings as any).splinteringEnabled ?? false,
        };
    } catch (error) {
        console.error('[LoadBalancing] Error fetching settings:', error);
        return null;
    }
}

/**
 * Update load balancing settings in database
 */
export async function updateLoadBalancingSettings(prisma: PrismaClient, config: Partial<LoadBalancingConfig>, userId?: number): Promise<LoadBalancingConfig> {
    const existing = await prisma.loadBalancingSettings.findFirst();

    if (existing) {
        const updated = await prisma.loadBalancingSettings.update({
            where: { id: existing.id },
            data: {
                enabled: config.enabled ?? existing.enabled,
                strategy: config.strategy ?? existing.strategy,
                autoAssignOnApproval: config.autoAssignOnApproval ?? existing.autoAssignOnApproval,
                roundRobinCounter: config.roundRobinCounter ?? existing.roundRobinCounter,
                splinteringEnabled: config.splinteringEnabled ?? (existing as any).splinteringEnabled ?? false,
                updatedBy: userId,
            },
        });

        return {
            enabled: updated.enabled,
            strategy: updated.strategy,
            autoAssignOnApproval: updated.autoAssignOnApproval,
            roundRobinCounter: updated.roundRobinCounter,
            splinteringEnabled: (updated as any).splinteringEnabled ?? false,
        };
    } else {
        const created = await prisma.loadBalancingSettings.create({
            data: {
                enabled: config.enabled ?? false,
                strategy: config.strategy ?? 'LEAST_LOADED',
                autoAssignOnApproval: config.autoAssignOnApproval ?? true,
                roundRobinCounter: config.roundRobinCounter ?? 0,
                splinteringEnabled: config.splinteringEnabled ?? false,
                updatedBy: userId,
            },
        });

        return {
            enabled: created.enabled,
            strategy: created.strategy,
            autoAssignOnApproval: created.autoAssignOnApproval,
            roundRobinCounter: created.roundRobinCounter,
            splinteringEnabled: (created as any).splinteringEnabled ?? false,
        };
    }
}

/**
 * Get all procurement officers with their current workload
 */
async function getProcurementOfficersWithWorkload(prisma: PrismaClient) {
    const officers = await prisma.user.findMany({
        where: {
            roles: { some: { role: { name: 'PROCUREMENT' } } },
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
    });

    if (officers.length === 0) {
        return [];
    }

    // Get workload for each officer (active assignments at PROCUREMENT_REVIEW stage)
    const officersWithWorkload = await Promise.all(
        officers.map(async (officer) => {
            const assignedCount = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: { in: ['PROCUREMENT_REVIEW'] },
                },
            });

            return {
                id: officer.id,
                name: officer.name,
                email: officer.email,
                assignedCount,
            };
        })
    );

    return officersWithWorkload;
}

/**
 * Select officer using LEAST_LOADED strategy
 * Assigns to the officer with the fewest active requests
 */
async function selectOfficerLeastLoaded(prisma: PrismaClient): Promise<number | null> {
    const officers = await getProcurementOfficersWithWorkload(prisma);

    if (officers.length === 0) {
        console.warn('[LoadBalancing] No procurement officers available');
        return null;
    }

    // Sort by workload ascending and pick first (least loaded)
    const sorted = officers.sort((a, b) => a.assignedCount - b.assignedCount);
    const selected = sorted[0];

    console.log(`[LoadBalancing] LEAST_LOADED strategy selected officer ${selected.name} (ID: ${selected.id}, current load: ${selected.assignedCount})`);
    return selected.id;
}

/**
 * Select officer using ROUND_ROBIN strategy
 * Cycles through officers in order, ensuring even distribution over time
 */
async function selectOfficerRoundRobin(prisma: PrismaClient): Promise<number | null> {
    const officers = await getProcurementOfficersWithWorkload(prisma);

    if (officers.length === 0) {
        console.warn('[LoadBalancing] No procurement officers available');
        return null;
    }

    // Get current settings to access counter
    const settings = await prisma.loadBalancingSettings.findFirst();
    if (!settings) {
        console.warn('[LoadBalancing] No settings found for round-robin counter');
        return null;
    }

    // Sort officers by ID for consistent ordering
    const sorted = officers.sort((a, b) => a.id - b.id);

    // Use modulo to cycle through officers
    const index = settings.roundRobinCounter % sorted.length;
    const selected = sorted[index];

    // Increment counter for next assignment
    await prisma.loadBalancingSettings.update({
        where: { id: settings.id },
        data: { roundRobinCounter: settings.roundRobinCounter + 1 },
    });

    console.log(`[LoadBalancing] ROUND_ROBIN strategy selected officer ${selected.name} (ID: ${selected.id}, position: ${index + 1}/${sorted.length})`);
    return selected.id;
}

/**
 * Select officer using RANDOM strategy
 * Randomly picks an officer from the available pool
 */
async function selectOfficerRandom(prisma: PrismaClient): Promise<number | null> {
    const officers = await getProcurementOfficersWithWorkload(prisma);

    if (officers.length === 0) {
        console.warn('[LoadBalancing] No procurement officers available');
        return null;
    }

    const randomIndex = Math.floor(Math.random() * officers.length);
    const selected = officers[randomIndex];

    console.log(`[LoadBalancing] RANDOM strategy selected officer ${selected.name} (ID: ${selected.id})`);
    return selected.id;
}

/**
 * Main auto-assignment function
 * Checks settings and assigns request to appropriate officer based on configured strategy
 *
 * @param prisma - Prisma client instance
 * @param requestId - ID of the request to assign
 * @returns Officer ID if assignment succeeded, null otherwise
 */
export async function autoAssignRequest(prisma: PrismaClient, requestId: number): Promise<number | null> {
    try {
        const settings = await getLoadBalancingSettings(prisma);

        // If load balancing is disabled, don't assign
        if (!settings || !settings.enabled) {
            console.log(`[LoadBalancing] Load balancing disabled, skipping auto-assignment for request ${requestId}`);
            return null;
        }

        console.log(`[LoadBalancing] Auto-assigning request ${requestId} using ${settings.strategy} strategy`);

        // Select officer based on strategy
        let officerId: number | null = null;

        switch (settings.strategy) {
            case 'LEAST_LOADED':
                officerId = await selectOfficerLeastLoaded(prisma);
                break;
            case 'ROUND_ROBIN':
                officerId = await selectOfficerRoundRobin(prisma);
                break;
            case 'RANDOM':
                officerId = await selectOfficerRandom(prisma);
                break;
            default:
                console.warn(`[LoadBalancing] Unknown strategy: ${settings.strategy}`);
                return null;
        }

        if (!officerId) {
            console.warn(`[LoadBalancing] No officer selected for request ${requestId}`);
            return null;
        }

        // Update request with assigned officer
        await prisma.request.update({
            where: { id: requestId },
            data: { currentAssigneeId: officerId },
        });

        // Record assignment log (if table exists)
        try {
            // @ts-expect-error dynamic model check
            if ((prisma as any).requestAssignmentLog) {
                // @ts-expect-error dynamic model usage
                await (prisma as any).requestAssignmentLog.create({
                    data: {
                        requestId,
                        officerId,
                        strategy: settings.strategy,
                        notes: `Auto-assigned via ${settings.strategy}`,
                    },
                });
            }
            // Update officer performance metrics
            // @ts-expect-error dynamic model check
            if ((prisma as any).officerPerformanceMetrics) {
                // @ts-expect-error dynamic model usage
                await (prisma as any).officerPerformanceMetrics.upsert({
                    where: { officerId: officerId },
                    update: {
                        activeAssignments: { increment: 1 },
                        lastAssignmentAt: new Date(),
                    },
                    create: {
                        officerId: officerId,
                        activeAssignments: 1,
                        completedAssignments: 0,
                        lastAssignmentAt: new Date(),
                    },
                });
            }
        } catch (logErr) {
            console.warn('[LoadBalancing] Failed to persist assignment analytics/log:', logErr);
        }

        // Log the assignment in status history
        await prisma.requestStatusHistory.create({
            data: {
                requestId: requestId,
                status: 'PROCUREMENT_REVIEW',
                changedById: null, // System-initiated
                comment: `Auto-assigned to officer (${settings.strategy} strategy)`,
            },
        });

        console.log(`[LoadBalancing] Successfully auto-assigned request ${requestId} to officer ${officerId}`);
        return officerId;
    } catch (error) {
        console.error(`[LoadBalancing] Error auto-assigning request ${requestId}:`, error);
        return null;
    }
}

/**
 * Check if auto-assignment should be triggered for a request status change
 *
 * @param newStatus - The new status the request is moving to
 * @param settings - Current load balancing settings
 * @returns true if auto-assignment should be triggered
 */
export function shouldAutoAssign(newStatus: string, settings: LoadBalancingConfig | null): boolean {
    if (!settings || !settings.enabled) {
        return false;
    }

    // Only auto-assign when moving to PROCUREMENT_REVIEW if autoAssignOnApproval is enabled
    if (newStatus === 'PROCUREMENT_REVIEW' && settings.autoAssignOnApproval) {
        return true;
    }

    return false;
}
