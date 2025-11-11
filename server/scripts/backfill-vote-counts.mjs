#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  let updated = 0;
  let checked = 0;
  const ideas = await prisma.idea.findMany({ select: { id: true, title: true, upvoteCount: true, downvoteCount: true, voteCount: true } });
  for (const idea of ideas) {
    checked++;
    const [up, down] = await Promise.all([
      prisma.vote.count({ where: { ideaId: idea.id, voteType: 'UPVOTE' } }),
      prisma.vote.count({ where: { ideaId: idea.id, voteType: 'DOWNVOTE' } }),
    ]);
    const score = up - down;
    if (up !== idea.upvoteCount || down !== idea.downvoteCount || score !== idea.voteCount) {
      await prisma.idea.update({ where: { id: idea.id }, data: { upvoteCount: up, downvoteCount: down, voteCount: score } });
      updated++;
      console.log(`Updated idea #${idea.id} (${idea.title}): up ${idea.upvoteCount}→${up}, down ${idea.downvoteCount}→${down}, score ${idea.voteCount}→${score}`);
    }
  }
  console.log(`Backfill complete. Checked ${checked}, updated ${updated}.`);
}

backfill()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
