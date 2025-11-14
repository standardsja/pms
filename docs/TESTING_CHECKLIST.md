# Innovation Hub Testing Checklist

## Pre-Testing Setup
- [x] Backend server running on port 4000
- [x] Frontend dev server running
- [x] Database has approved ideas (2 ideas with APPROVED status)
- [x] Committee account exists (committee@bsj.gov.jm / Committee123!)
- [x] Regular test user account exists

## Critical Functionality Tests

### 1. Idea Submission Workflow ✅
- [ ] Regular user can submit new idea
- [ ] Idea automatically gets `PENDING_REVIEW` status
- [ ] Idea appears in "My Ideas" with yellow "Under Review" badge
- [ ] Idea does NOT appear in public Idea Gallery
- [ ] Committee can see the pending idea in Review Ideas page
- [ ] File uploads work (max 5 files, 10MB limit each)
- [ ] Image thumbnails generate automatically

### 2. Committee Review Workflow ✅
- [ ] Committee login works with committee@bsj.gov.jm
- [ ] Committee Dashboard shows pending count
- [ ] Review Ideas page displays all pending ideas
- [ ] **Approve Action:**
  - [ ] Click Approve → Enter optional feedback → Confirm
  - [ ] Idea status changes to APPROVED immediately
  - [ ] Idea appears in Idea Gallery for all users
  - [ ] Idea disappears from "Pending" tab, appears in "Approved" tab
- [ ] **Reject Action:**
  - [ ] Click Reject → Enter feedback → Confirm
  - [ ] Idea status changes to REJECTED
  - [ ] Idea disappears from pending, appears in "Rejected" tab
  - [ ] User sees rejection feedback in "My Ideas"
- [ ] **Promote Action:**
  - [ ] Click Promote → Project code auto-generates (INNO-YYYY-XXXXX)
  - [ ] Can edit project code or leave blank for auto-generation
  - [ ] Idea status changes to PROMOTED_TO_PROJECT
  - [ ] Idea appears in BSJ Projects page

### 3. Voting System ✅
- [ ] Regular user can vote on APPROVED ideas
- [ ] Upvote increments vote count immediately
- [ ] Downvote decrements vote count immediately
- [ ] Clicking same vote type removes vote
- [ ] Switching vote updates counts correctly (net change of 2)
- [ ] **Vote Limit:**
  - [ ] User can vote on up to 10 ideas
  - [ ] On 11th vote attempt, see error: "Vote Limit Reached"
  - [ ] Message shows: "You've used all 10 of your votes..."
  - [ ] Removing a vote frees up a vote slot
- [ ] Vote counts update in real-time (15s polling)
- [ ] Duplicate vote protection works

### 4. Real-Time Synchronization ✅
- [ ] Submit idea in one browser → Appears for committee in another within 15s
- [ ] Committee approves → Appears in Idea Gallery within 15s
- [ ] Vote on idea → Vote count updates for other users within 15s
- [ ] Comment on idea → Comment appears within 15s
- [ ] Page visibility change triggers immediate refresh

### 5. Role-Based Access Control ✅
- [ ] Regular users only see APPROVED ideas in gallery
- [ ] Regular users cannot access /innovation/committee routes
- [ ] Committee sees ALL ideas (pending, approved, rejected)
- [ ] Committee can access Review Ideas page
- [ ] JWT token includes roles array
- [ ] Backend verifies INNOVATION_COMMITTEE role on protected endpoints

### 6. UI/UX Polish
- [ ] Status filter labels display correctly (not enum values)
  - [ ] "🆕 Most Recent" not "recent"
  - [ ] "⭐ Most Popular" not "popular"
  - [ ] "🔥 Trending" not "trending"
  - [ ] "Pending Review" not "PENDING_REVIEW"
  - [ ] "Approved" not "APPROVED"
  - [ ] "Implemented" not "PROMOTED_TO_PROJECT"
- [ ] "Clear Filters" button works when no ideas found
- [ ] Loading skeletons show during data fetch
- [ ] Empty states show helpful messages
- [ ] Toast notifications appear for all actions

### 7. Error Handling
- [ ] Invalid idea ID returns 404
- [ ] Missing required fields shows validation error
- [ ] File too large (>10MB) shows error
- [ ] Network error shows retry message
- [ ] Concurrent vote attempts handled gracefully
- [ ] XSS protection in idea descriptions
- [ ] SQL injection prevention (Prisma parameterization)

### 8. Performance
- [ ] Idea Gallery loads in <2 seconds
- [ ] Vote action completes in <500ms
- [ ] No console errors
- [ ] No memory leaks (useEffect cleanup verified)
- [ ] Database queries use indexes (status, category, submittedBy)
- [ ] API responses are <1s even with 100+ ideas

### 9. Browser Compatibility
- [ ] Chrome - Innovation Hub works
- [ ] Firefox - Innovation Hub works
- [ ] Safari - Innovation Hub works  
- [ ] Edge - Innovation Hub works
- [ ] Mobile responsive design works
- [ ] Tablet responsive design works

## Test Accounts

### Regular User
- **Email:** Any existing user from database
- **Expected:** Can submit ideas, vote (max 10), view approved ideas only

### Committee Member
- **Email:** committee@bsj.gov.jm
- **Password:** Committee123!
- **Expected:** Can see all ideas, approve/reject/promote, access committee dashboard

## Known Limitations
- No WebSocket - uses 15s polling for real-time updates
- No rate limiting on API endpoints (consider adding for production)
- No virus scanning on uploaded files (AttachmentSafeStatus always PENDING)
- No email notifications (consider adding for production)

## Production Readiness
- [x] All TypeScript errors fixed
- [x] Vote limit enforcement added
- [x] Role-based filtering implemented
- [x] Status label translations added
- [x] Database indexes verified
- [x] Error handling improved
- [ ] Add rate limiting middleware
- [ ] Add file virus scanning
- [ ] Add email notification system
- [ ] Add comprehensive logging
- [ ] Add performance monitoring
- [ ] Add automated tests (Jest/Vitest)

## Quick Test Commands

```bash
# Check database for approved ideas
cd server && node checkIdeas.mjs

# Restart server to apply latest changes
# Stop existing server (Ctrl+C in terminal)
node index.mjs

# Check server logs for errors
# Look for: [api/ideas] Non-committee user - showing only APPROVED ideas
```

## Bug Reporting Template
```
**Issue:** Brief description
**Steps to Reproduce:**
1. Action 1
2. Action 2
3. Result

**Expected:** What should happen
**Actual:** What actually happened
**User Role:** Committee / Regular User
**Browser:** Chrome 120 / Firefox 121 / etc.
**Console Errors:** Any errors in browser console
```
