#!/usr/bin/env node
import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function main() {
  const res = await fetch(`${BASE_URL}/api/ideas?status=promoted&t=${Date.now()}`);
  if (!res.ok) {
    console.error('Failed to fetch ideas:', res.status, await res.text());
    process.exit(1);
  }
  const ideas = await res.json();
  console.log(`Found ${ideas.length} promoted ideas`);
  for (const i of ideas) {
    console.log(`#${i.id} ${i.title} — up ${i.upvoteCount}, down ${i.downvoteCount}, score ${i.voteCount}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
