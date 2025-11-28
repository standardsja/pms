# Innovation Hub - Centralized API Configuration Testing Guide

## Overview

The Innovation Hub has been updated to use centralized API configuration that supports both local development and remote deployment without code changes.

## Changes Made

### 1. Created Centralized Configuration

**File:** `src/config/api.ts`

-   `getApiBaseUrl()`: Returns `VITE_API_URL` from env, falls back to `http://heron:4000`
-   `getApiUrl(path)`: Builds full URL from base + path

### 2. Updated Innovation Hub Files

All Innovation Hub files now use the centralized `getApiUrl` helper:

#### Updated Files:

1. **src/utils/ideasApi.ts**

    - All ~25+ fetch calls now use `getApiUrl('/api/...')`
    - Functions updated: fetchIdeas, fetchIdeaById, fetchComments, approveIdea, rejectIdea, promoteIdea, voteForIdea, removeVote, and more

2. **src/pages/Innovation/Ideas/MyIdeas.tsx**

    - Updated fetchCommentsForIdea to use `getApiUrl`
    - Updated handleAddComment to use `getApiUrl`

3. **src/pages/Innovation/Ideas/SubmitIdea.tsx**
    - Updated duplicate detection fetch call to use `getApiUrl`

### 3. Environment Configuration

Updated `.env.example` with detailed documentation on how to configure `VITE_API_URL` for different environments.

## How It Works

The centralized configuration follows this logic:

```typescript
// src/config/api.ts
export function getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.trim() !== '') {
        return envUrl.trim();
    }
    return 'http://heron:4000'; // Default fallback
}
```

## Testing Instructions

### Test 1: Local Development Configuration

Test that the app works when connecting to localhost backend:

1. **Create or update `.env` file:**

    ```bash
    echo "VITE_API_URL=http://localhost:4000" > .env
    ```

2. **Ensure backend is running locally:**

    ```bash
    # In a separate terminal
    npm run dev:server
    # Should see: Server listening on http://0.0.0.0:4000
    ```

3. **Start frontend:**

    ```bash
    npm run dev
    ```

4. **Test Innovation Hub features:**

    - Navigate to Innovation Hub
    - Browse ideas (check browser Network tab - should call `http://localhost:4000/api/ideas`)
    - View idea details
    - Submit new idea
    - Add comments
    - Vote on ideas
    - Check duplicate detection when creating idea

5. **Verify in browser DevTools:**
    - Open Network tab
    - All API calls should go to `http://localhost:4000`
    - No connection errors in Console

### Test 2: Remote Deployment Configuration (Heron)

Test that the app works when backend is on remote server:

1. **Update `.env` file (or leave VITE_API_URL unset):**

    ```bash
    # Option A: Set explicitly
    echo "VITE_API_URL=http://heron:4000" > .env

    # Option B: Leave unset to use fallback
    # Comment out or remove VITE_API_URL from .env
    ```

2. **Rebuild frontend:**

    ```bash
    npm run build
    ```

3. **Test the built application:**

    - Deploy or serve the built files
    - Navigate to Innovation Hub
    - Test all same features as Test 1

4. **Verify in browser DevTools:**
    - Open Network tab
    - All API calls should go to `http://heron:4000`
    - No connection errors in Console

### Test 3: Switching Between Environments

Test that switching environments is seamless:

1. **Switch from local to heron:**

    ```bash
    # Change .env
    sed -i '' 's|VITE_API_URL=http://localhost:4000|VITE_API_URL=http://heron:4000|' .env

    # Restart dev server (Ctrl+C then npm run dev)
    ```

2. **Verify API calls now go to heron:4000**

3. **Switch back:**

    ```bash
    sed -i '' 's|VITE_API_URL=http://heron:4000|VITE_API_URL=http://localhost:4000|' .env
    # Restart dev server
    ```

4. **Verify API calls now go to localhost:4000**

## Features to Test in Innovation Hub

### Core Features:

-   ✅ Browse ideas list
-   ✅ Filter and sort ideas
-   ✅ View idea details
-   ✅ Submit new idea
-   ✅ Edit own ideas
-   ✅ Delete own ideas
-   ✅ View and add comments
-   ✅ Vote (upvote/downvote)
-   ✅ Remove vote
-   ✅ Duplicate detection during submission
-   ✅ Tag management
-   ✅ Challenge participation
-   ✅ File attachments

### Admin Features (if applicable):

-   ✅ Approve ideas
-   ✅ Reject ideas
-   ✅ Promote ideas to projects
-   ✅ View analytics

## Expected Results

### Success Criteria:

1. ✅ No console errors about connection refused
2. ✅ API calls go to correct host (localhost or heron based on .env)
3. ✅ All Innovation Hub features work correctly in both configurations
4. ✅ No code changes required when switching environments
5. ✅ Build process works correctly with both configurations

### Common Issues and Solutions:

**Issue:** Still seeing connection to wrong host

-   **Solution:** Clear browser cache, restart dev server, verify .env is being read

**Issue:** CORS errors

-   **Solution:** Ensure backend CORS configuration allows the frontend origin

**Issue:** 404 on API calls

-   **Solution:** Verify backend is running and accessible at the configured URL

## Next Steps

After Innovation Hub testing is successful:

1. Apply same pattern to Procurement module files
2. Update all service files (`messageApi.ts`, `notificationApi.ts`, `evaluationService.ts`, etc.)
3. Update Procurement page components
4. Run comprehensive end-to-end testing

## Rollback Plan

If issues occur, revert by:

```bash
git checkout src/config/api.ts src/utils/ideasApi.ts src/pages/Innovation/
```

## Notes for Developers

-   The `getApiUrl` helper is the single source of truth for API URLs
-   Always use `getApiUrl('/api/endpoint')` for API calls
-   Never hardcode `http://localhost:4000` or `http://heron:4000`
-   Update `.env` file to switch environments (no code changes needed)
-   The fallback to `http://heron:4000` ensures deployment works even if VITE_API_URL is not set
