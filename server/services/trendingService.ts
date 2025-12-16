import { prisma } from '../prismaClient.js';

/**
 * Calculate trending score for ideas using time-decay algorithm
 * 
 * Formula: (upvotes - downvotes + views/10) / (age_in_hours + 2)^1.5
 * 
 * This gives higher scores to:
 * - Ideas with more net upvotes
 * - Recent ideas (time decay factor)
 * - Ideas with more views
 * 
 * The +2 hours prevents division by zero and reduces volatility for very new ideas
 */
export function calculateTrendingScore(
  upvotes: number,
  downvotes: number,
  views: number,
  createdAt: Date
): number {
  const now = new Date();
  const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // Net votes with view bonus
  const netScore = upvotes - downvotes + (views / 10);
  
  // Time decay factor (older posts decay faster)
  const gravity = 1.5;
  const timeFactor = Math.pow(ageInHours + 2, gravity);
  
  return netScore / timeFactor;
}

/**
 * Update trending scores for all ideas
 * Should be run periodically (e.g., every hour via cron job)
 */
export async function updateAllTrendingScores(): Promise<number> {
  try {
    console.log('[Trending] Starting trending score update...');
    
    // Fetch all ideas with their vote counts
    const ideas = await prisma.idea.findMany({
      select: {
        id: true,
        upvoteCount: true,
        downvoteCount: true,
        viewCount: true,
        createdAt: true,
      },
    });

    let updated = 0;
    
    // Update in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < ideas.length; i += batchSize) {
      const batch = ideas.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (idea) => {
          const score = calculateTrendingScore(
            idea.upvoteCount,
            idea.downvoteCount,
            idea.viewCount,
            idea.createdAt
          );
          
          // Workaround: Use raw SQL until Prisma regenerates with trendingScore
          await prisma.$executeRaw`UPDATE Idea SET trendingScore = ${score} WHERE id = ${idea.id}`;
        })
      );
      
      updated += batch.length;
    }
    
    console.log(`[Trending] Updated ${updated} trending scores`);
    return updated;
  } catch (error) {
    console.error('[Trending] Error updating trending scores:', error);
    throw error;
  }
}

/**
 * Update trending score for a single idea
 * Called after votes or views change
 */
export async function updateIdeaTrendingScore(ideaId: number): Promise<void> {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: {
        upvoteCount: true,
        downvoteCount: true,
        viewCount: true,
        createdAt: true,
      },
    });

    if (!idea) return;

    const score = calculateTrendingScore(
      idea.upvoteCount,
      idea.downvoteCount,
      idea.viewCount,
      idea.createdAt
    );

    // Workaround: Use raw SQL until Prisma regenerates with trendingScore
    await prisma.$executeRaw`UPDATE Idea SET trendingScore = ${score} WHERE id = ${ideaId}`;
  } catch (error) {
    console.error(`[Trending] Error updating trending score for idea ${ideaId}:`, error);
  }
}

/**
 * Initialize trending score background job
 * Updates all scores every hour
 */
export function initTrendingScoreJob(): NodeJS.Timeout {
  console.log('[Trending] Initializing trending score background job (1 hour interval)');
  
  // Run immediately on startup
  updateAllTrendingScores().catch(err => 
    console.error('[Trending] Initial update failed:', err)
  );
  
  // Then run every hour
  const interval = setInterval(() => {
    updateAllTrendingScores().catch(err => 
      console.error('[Trending] Scheduled update failed:', err)
    );
  }, 60 * 60 * 1000); // 1 hour
  
  return interval;
}
