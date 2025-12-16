import { compareTwoStrings, findBestMatch } from 'string-similarity';
import { prisma } from '../prismaClient.js';

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Dice's Coefficient algorithm
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  return compareTwoStrings(normalized1, normalized2);
}

/**
 * Find potential duplicate ideas based on title and description similarity
 * 
 * @param title - Title of the new idea
 * @param description - Description of the new idea
 * @param thresholdTitle - Minimum similarity score for title (0-1), default 0.7
 * @param thresholdDescription - Minimum similarity score for description (0-1), default 0.6
 * @returns Array of potential duplicate ideas with similarity scores
 */
export async function findPotentialDuplicates(
  title: string,
  description: string,
  options: {
    thresholdTitle?: number;
    thresholdDescription?: number;
    limit?: number;
    excludeRejected?: boolean;
  } = {}
): Promise<Array<{
  id: number;
  title: string;
  description: string;
  status: string;
  titleSimilarity: number;
  descriptionSimilarity: number;
  overallSimilarity: number;
}>> {
  const {
    thresholdTitle = 0.7,
    thresholdDescription = 0.6,
    limit = 5,
    excludeRejected = true
  } = options;

  try {
    // Fetch recent ideas for comparison (last 6 months, max 500)
    const where: any = {
      createdAt: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 months
      }
    };
    
    if (excludeRejected) {
      where.status = { not: 'REJECTED' };
    }

    const existingIdeas = await prisma.idea.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    if (existingIdeas.length === 0) {
      return [];
    }

    // Calculate similarities
    const duplicates = existingIdeas
      .map(idea => {
        const titleSimilarity = calculateSimilarity(title, idea.title);
        const descriptionSimilarity = calculateSimilarity(description, idea.description);
        
        // Weighted average (title is more important)
        const overallSimilarity = (titleSimilarity * 0.6) + (descriptionSimilarity * 0.4);

        return {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          status: idea.status,
          titleSimilarity,
          descriptionSimilarity,
          overallSimilarity,
        };
      })
      // Filter by threshold
      .filter(item => 
        item.titleSimilarity >= thresholdTitle || 
        item.descriptionSimilarity >= thresholdDescription ||
        item.overallSimilarity >= Math.min(thresholdTitle, thresholdDescription)
      )
      // Sort by overall similarity
      .sort((a, b) => b.overallSimilarity - a.overallSimilarity)
      // Limit results
      .slice(0, limit);

    return duplicates;
  } catch (error) {
    console.error('[DuplicateDetection] Error finding duplicates:', error);
    return [];
  }
}

/**
 * Check if an idea is likely a duplicate
 * Returns true if high confidence duplicate found
 */
export async function isDuplicateIdea(
  title: string,
  description: string
): Promise<boolean> {
  const duplicates = await findPotentialDuplicates(title, description, {
    thresholdTitle: 0.85, // High confidence threshold
    thresholdDescription: 0.75,
    limit: 1,
  });

  return duplicates.length > 0 && duplicates[0].overallSimilarity >= 0.8;
}

/**
 * Get duplicate detection stats
 */
export async function getDuplicateStats(): Promise<{
  totalIdeas: number;
  potentialDuplicates: number;
  duplicateRate: number;
}> {
  try {
    const totalIdeas = await prisma.idea.count();
    
    // This is a rough estimate - in production, you'd store duplicate flags
    // For now, return placeholder stats
    return {
      totalIdeas,
      potentialDuplicates: 0,
      duplicateRate: 0,
    };
  } catch (error) {
    console.error('[DuplicateDetection] Error getting stats:', error);
    return {
      totalIdeas: 0,
      potentialDuplicates: 0,
      duplicateRate: 0,
    };
  }
}
