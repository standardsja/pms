import { prisma } from '../prismaClient.js';
import { Prisma } from '@prisma/client';

/**
 * Search ideas with full-text search and relevance scoring
 *
 * Features:
 * - Searches across title, description, and category
 * - Weighted relevance scoring (title > description > category)
 * - Fuzzy matching with partial word matches
 * - Pagination support
 */
export async function searchIdeas(
    query: string,
    options: {
        status?: string | string[];
        category?: string | string[];
        userId?: number;
        limit?: number;
        offset?: number;
    } = {}
): Promise<{
    results: Array<{
        id: number;
        title: string;
        description: string;
        category: string;
        status: string;
        voteCount: number;
        viewCount: number;
        createdAt: Date;
        relevanceScore: number;
    }>;
    total: number;
}> {
    const { status, category, userId, limit = 20, offset = 0 } = options;

    try {
        // Normalize search query
        const searchTerm = query.trim().toLowerCase();
        if (!searchTerm) {
            return { results: [], total: 0 };
        }

        // Build where clause
        const where: any = {};

        if (status) {
            where.status = Array.isArray(status) ? { in: status } : status;
        }

        if (category) {
            where.category = Array.isArray(category) ? { in: category } : category;
        }

        if (userId) {
            where.submittedBy = userId;
        }

        // MySQL full-text search using MATCH AGAINST
        // Note: Requires FULLTEXT index on title and description
        const searchWords = searchTerm.split(/\s+/).filter((w) => w.length > 0);

        // Use OR conditions for partial matching
        const searchConditions = searchWords.flatMap((word) => [{ title: { contains: word } }, { description: { contains: word } }]);

        where.OR = searchConditions;

        // Fetch matching ideas
        const [ideas, total] = await Promise.all([
            prisma.idea.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    status: true,
                    voteCount: true,
                    viewCount: true,
                    createdAt: true,
                },
                take: limit,
                skip: offset,
            }),
            prisma.idea.count({ where }),
        ]);

        // Calculate relevance scores
        const results = ideas
            .map((idea: typeof ideas[number]) => {
                let relevanceScore = 0;

                const titleLower = idea.title.toLowerCase();
                const descLower = idea.description.toLowerCase();
                const categoryLower = idea.category.toLowerCase();

                // Exact phrase match (highest score)
                if (titleLower.includes(searchTerm)) {
                    relevanceScore += 100;
                }
                if (descLower.includes(searchTerm)) {
                    relevanceScore += 50;
                }

                // Individual word matches
                searchWords.forEach((word: string) => {
                    // Title matches (weight: 10)
                    if (titleLower.includes(word)) {
                        relevanceScore += 10;
                        // Boost if word is at start of title
                        if (titleLower.startsWith(word)) {
                            relevanceScore += 5;
                        }
                    }

                    // Description matches (weight: 5)
                    const descMatches = (descLower.match(new RegExp(word, 'g')) || []).length;
                    relevanceScore += descMatches * 5;

                    // Category matches (weight: 3)
                    if (categoryLower.includes(word)) {
                        relevanceScore += 3;
                    }
                });

                // Boost by popularity (votes and views)
                relevanceScore += Math.log(idea.voteCount + 1) * 2;
                relevanceScore += Math.log(idea.viewCount + 1);

                // Recency boost (newer ideas get slight advantage)
                const ageInDays = (Date.now() - idea.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays < 7) {
                    relevanceScore += 5; // Boost if less than a week old
                }

                return {
                    ...idea,
                    relevanceScore,
                };
            })
            .sort((a: typeof ideas[number] & { relevanceScore: number }, b: typeof ideas[number] & { relevanceScore: number }) => b.relevanceScore - a.relevanceScore); // Sort by relevance

        return { results, total };
    } catch (error) {
        console.error('[Search] Error searching ideas:', error);
        return { results: [], total: 0 };
    }
}

/**
 * Get search suggestions based on partial query
 * Returns top matching titles for autocomplete
 */
export async function getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
        const searchTerm = query.trim().toLowerCase();
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }

        const ideas = await prisma.idea.findMany({
            where: {
                OR: [{ title: { contains: searchTerm } }],
                status: { in: ['PENDING_REVIEW', 'APPROVED', 'PROMOTED_TO_PROJECT'] },
            },
            select: {
                title: true,
            },
            take: limit,
            orderBy: {
                voteCount: 'desc', // Most popular first
            },
        });

        return ideas.map((idea: typeof ideas[number]) => idea.title);
    } catch (error) {
        console.error('[Search] Error getting suggestions:', error);
        return [];
    }
}

/**
 * Get popular search terms (most frequently searched words)
 * Note: In production, you'd log search queries and analyze them
 * For now, returns popular words from idea titles
 */
export async function getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    try {
        const ideas = await prisma.idea.findMany({
            where: {
                status: { in: ['APPROVED', 'PROMOTED_TO_PROJECT'] },
            },
            select: {
                title: true,
            },
            orderBy: {
                voteCount: 'desc',
            },
            take: 50,
        });

        // Extract and count words
        const wordCounts = new Map<string, number>();

        ideas.forEach((idea: typeof ideas[number]) => {
            const words = idea.title
                .toLowerCase()
                .split(/\s+/)
            .filter((word: string) => word.length > 3); // Filter short words

            words.forEach((word) => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
        });

        // Sort by frequency and return top terms
        return Array.from(wordCounts.entries())
            .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
            .slice(0, limit)
            .map(([word]) => word);
    } catch (error) {
        console.error('[Search] Error getting popular terms:', error);
        return [];
    }
}
