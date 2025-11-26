import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoadBalancingConfig {
    enabled: boolean;
    strategy: 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM';
    autoAssignOnApproval: boolean;
}

/**
 * Get current load balancing settings
 */
export async function getSettings(): Promise<LoadBalancingConfig> {
    const settings = await prisma.loadBalancingSettings.findFirst({
        orderBy: { id: 'desc' },
    });

    if (!settings) {
        return {
            enabled: false,
            strategy: 'LEAST_LOADED',
            autoAssignOnApproval: true,
        };
    }

    return {
        enabled: settings.enabled,
        strategy: settings.strategy as 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM',
        autoAssignOnApproval: settings.autoAssignOnApproval,
    };
}

/**
 * Update load balancing settings
 */
export async function updateSettings(config: LoadBalancingConfig): Promise<LoadBalancingConfig> {
    // Delete old settings and create new one (simple approach for single-row config)
    await prisma.loadBalancingSettings.deleteMany({});

    const settings = await prisma.loadBalancingSettings.create({
        data: {
            enabled: config.enabled,
            strategy: config.strategy,
            autoAssignOnApproval: config.autoAssignOnApproval,
            lastRoundRobinIndex: 0,
        },
    });

    return {
        enabled: settings.enabled,
        strategy: settings.strategy as 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM',
        autoAssignOnApproval: settings.autoAssignOnApproval,
    };
}

/**
 * Get all procurement officers
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
 * Count active requests assigned to each officer
 */
async function getOfficerWorkloads() {
    const officers = await getProcurementOfficers();

    const workloads = await Promise.all(
        officers.map(async (officer) => {
            const count = await prisma.request.count({
                where: {
                    currentAssigneeId: officer.id,
                    status: {
                        in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'],
                    },
                },
            });
            return { officer, count };
        })
    );

    return workloads;
}

/**
 * LEAST_LOADED strategy: Assign to officer with fewest active requests
 */
async function selectLeastLoaded(): Promise<number | null> {
    const workloads = await getOfficerWorkloads();

    if (workloads.length === 0) {
        return null;
    }

    // Sort by count ascending, then by id for deterministic tie-breaking
    workloads.sort((a, b) => {
        if (a.count !== b.count) {
            return a.count - b.count;
        }
        return a.officer.id - b.officer.id;
    });

    return workloads[0].officer.id;
}

/**
 * ROUND_ROBIN strategy: Rotate through officers sequentially
 */
async function selectRoundRobin(): Promise<number | null> {
    const officers = await getProcurementOfficers();

    if (officers.length === 0) {
        return null;
    }

    // Sort by ID for consistent ordering
    officers.sort((a, b) => a.id - b.id);

    // Get current round-robin index
    const settings = await prisma.loadBalancingSettings.findFirst({
        orderBy: { id: 'desc' },
    });

    const currentIndex = settings?.lastRoundRobinIndex || 0;
    const nextIndex = (currentIndex + 1) % officers.length;

    // Update the index for next time
    if (settings) {
        await prisma.loadBalancingSettings.update({
            where: { id: settings.id },
            data: { lastRoundRobinIndex: nextIndex },
        });
    }

    return officers[nextIndex].id;
}

/**
 * RANDOM strategy: Randomly select an officer
 */
async function selectRandom(): Promise<number | null> {
    const officers = await getProcurementOfficers();

    if (officers.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * officers.length);
    return officers[randomIndex].id;
}

/**
 * Select officer based on current strategy
 */
export async function selectOfficer(strategy: 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM'): Promise<number | null> {
    switch (strategy) {
        case 'LEAST_LOADED':
            return selectLeastLoaded();
        case 'ROUND_ROBIN':
            return selectRoundRobin();
        case 'RANDOM':
            return selectRandom();
        default:
            return selectLeastLoaded();
    }
}

/**
 * Auto-assign request to officer using configured strategy
 */
export async function autoAssignRequest(requestId: number, triggeredById: number): Promise<boolean> {
    try {
        const settings = await getSettings();

        // Check if auto-assignment is enabled
        if (!settings.enabled) {
            console.log(`Auto-assignment disabled for request ${requestId}`);
            return false;
        }

        // Select officer using strategy
        const officerId = await selectOfficer(settings.strategy);

        if (!officerId) {
            console.error(`No procurement officers available for request ${requestId}`);
            return false;
        }

        // Get officer details
        const officer = await prisma.user.findUnique({
            where: { id: officerId },
            select: { name: true },
        });

        // Assign request
        await prisma.request.update({
            where: { id: requestId },
            data: {
                currentAssigneeId: officerId,
                statusHistory: {
                    create: {
                        status: 'PROCUREMENT_REVIEW',
                        changedById: triggeredById,
                        comment: `Auto-assigned to ${officer?.name || 'officer'} using ${settings.strategy} strategy`,
                    },
                },
            },
        });

        console.log(`Request ${requestId} auto-assigned to officer ${officerId} using ${settings.strategy}`);
        return true;
    } catch (error) {
        console.error(`Auto-assignment failed for request ${requestId}:`, error);
        return false;
    }
}

/**
 * Check and auto-assign pending requests at PROCUREMENT_REVIEW status
 */
export async function autoAssignPendingRequests(triggeredById: number): Promise<number> {
    try {
        const settings = await getSettings();

        if (!settings.enabled) {
            return 0;
        }

        // Find unassigned requests at PROCUREMENT_REVIEW
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

        console.log(`Auto-assigned ${assignedCount} pending requests`);
        return assignedCount;
    } catch (error) {
        console.error('Error auto-assigning pending requests:', error);
        return 0;
    }
}
