#!/usr/bin/env node

import { execSync } from 'child_process';
import { cpSync, mkdirSync } from 'fs';
import { dirname } from 'path';

try {
  // Step 1: Run TypeScript compiler
  console.log('[Build] Running TypeScript compiler...');
  execSync('tsc --project tsconfig.server.json', { stdio: 'inherit' });
  
  // Step 2: Copy config files to dist
  console.log('[Build] Copying config files to dist...');
  const configSrc = 'server/config';
  const configDest = 'dist/server/config';
  
  // Ensure destination directory exists
  mkdirSync(configDest, { recursive: true });
  
  // Copy the entire config directory
  cpSync(configSrc, configDest, { recursive: true, force: true });
  
  console.log('[Build] ✓ Build complete. Config files copied to dist.');
  process.exit(0);
} catch (error) {
  console.error('[Build] ✗ Build failed:', error.message);
  process.exit(1);
}
