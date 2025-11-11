# Innovation Hub Testing Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Start the Servers

**Terminal 1 - Backend:**
```bash
cd c:\Users\kmillwood\Desktop\pms\server
node index.mjs
```
✅ Should see: `Server listening on port 4000`

**Terminal 2 - Frontend:**
```bash
cd c:\Users\kmillwood\Desktop\pms
npm run dev
```
✅ Should see: `Local: http://localhost:5173/`

### 2. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Committee Member** | committee@bsj.gov.jm | Committee123! |
| **Regular User** | *(any existing user)* | *(their password)* |

## 🎯 Critical Tests (15 minutes)

### Test 1: Submit an Idea (2 minutes)
1. Login as **regular user**
2. Go to **Innovation Hub** → **Submit Idea**
3. Fill in:
   - Title: "Test Idea - Auto Refresh System"
   - Description: "Testing the submission workflow"
   - Category: Technology
   - Upload a small image (optional)
4. Click **Submit**
5. ✅ Should see success message
6. Go to **My Ideas**
7. ✅ Should see your idea with **🔍 Under Review** badge (yellow)
8. Go to **Idea Gallery**
9. ✅ Should **NOT** see your idea (not approved yet)

### Test 2: Committee Approves Idea (3 minutes)
1. **Open new browser/incognito window**
2. Login as **committee@bsj.gov.jm**
3. Go to **Committee Dashboard** → **Review Ideas**
4. ✅ Should see "Test Idea - Auto Refresh System" in Pending tab
5. Click **Approve** button
6. Enter feedback: "Great idea! Approved for implementation"
7. Click **Confirm**
8. ✅ Idea should move to **Approved** tab
9. **Switch back to regular user browser**
10. Go to **Idea Gallery**
11. **Wait 15 seconds** (auto-refresh)
12. ✅ Your idea should now appear in the gallery!

### Test 3: Voting System (3 minutes)
1. As **regular user**, go to **Vote on Ideas**
2. Click **👍 Upvote** on an approved idea
3. ✅ Vote count should increase immediately
4. Click **👍** again
5. ✅ Should remove vote (count decreases)
6. Click **👎 Downvote**
7. ✅ Should work (count decreases)
8. Vote on **9 different ideas** (total 10 votes)
9. Try to vote on **11th idea**
10. ✅ Should see error: **"Vote Limit Reached - You can only vote on up to 10 ideas"**

### Test 4: Committee Workflow (5 minutes)
1. As **committee**, go to **Review Ideas**
2. Test **Reject**:
   - Click **Reject** on a pending idea
   - Enter: "Needs more detail"
   - ✅ Should move to Rejected tab
3. Test **Promote**:
   - Click **Promote to Project** on an approved idea
   - ✅ Should auto-generate code like "INNO-2025-ABC12"
   - Edit code or leave as-is
   - Click **OK**
   - ✅ Idea should be promoted
4. Go to **BSJ Projects**
5. ✅ Should see promoted idea with project code

### Test 5: Real-Time Updates (2 minutes)
1. Keep **2 browser windows** open:
   - Window A: Regular user
   - Window B: Committee
2. In **Window B** (committee), approve a pending idea
3. In **Window A** (regular user), stay on Idea Gallery
4. **Wait 15 seconds**
5. ✅ Newly approved idea should appear automatically

## ✅ What to Look For

### ✅ **GOOD Signs**
- No red errors in browser console (F12)
- Toast notifications appear for actions
- Vote counts update instantly
- Status badges show colors (yellow for pending, green for approved)
- Real-time updates work within 15 seconds
- Loading skeletons show while fetching data

### ❌ **BAD Signs** (Report These!)
- Red errors in browser console
- "Failed to fetch" errors
- Vote count doesn't update
- Ideas don't appear after approval
- Status badges show enum values like "PENDING_REVIEW"
- Filter labels show "recent" instead of "🆕 Most Recent"
- Can vote more than 10 times
- Page freezes or becomes unresponsive

## 🐛 Found a Bug?

### Report Format:
```
**Bug:** Brief description

**Steps:**
1. Action 1
2. Action 2
3. Result

**Expected:** What should happen
**Actual:** What happened

**User:** Committee / Regular User
**Browser:** Chrome / Firefox / Safari / Edge
**Console Errors:** (Copy from F12 console)
```

### Example:
```
**Bug:** Can't vote on ideas

**Steps:**
1. Login as regular user
2. Go to Vote on Ideas
3. Click upvote button
4. Nothing happens

**Expected:** Vote count increases, see success toast
**Actual:** No change, no message

**User:** Regular User (john@example.com)
**Browser:** Chrome 120
**Console Errors:** 
POST /api/ideas/5/vote 400 (Bad Request)
Error: x-user-id header required
```

## 📊 Performance Check

Open **Chrome DevTools (F12)** → **Network** tab:

| Endpoint | Expected Time | Status |
|----------|--------------|--------|
| GET /api/ideas | < 2 seconds | 200 |
| POST /api/ideas/:id/vote | < 500ms | 200 |
| POST /api/ideas/:id/approve | < 1 second | 200 |
| File upload | < 5 seconds | 200 |

❌ **If slower:** Note the endpoint and time, report it.

## 🔍 Common Issues & Fixes

### Issue: "No Ideas Found" in Gallery
**Fix:**
```bash
cd server
node checkIdeas.mjs
# Should show at least 2 APPROVED ideas
# If not, run:
node approveIdea.mjs
```

### Issue: Can't login as committee
**Fix:** Password is `Committee123!` (capital C, exclamation mark)

### Issue: Server not starting
**Fix:**
```bash
cd server
# Check if port 4000 is in use
netstat -ano | findstr :4000
# If yes, kill the process or change port in index.mjs
```

### Issue: Frontend not loading
**Fix:**
```bash
# Clear cache and reinstall
npm clean-cache --force
npm install
npm run dev
```

## 📞 Need Help?

1. Check **TESTING_CHECKLIST.md** for detailed tests
2. Check **INNOVATION_HUB_OPTIMIZATION.md** for technical details
3. Check browser console (F12) for error messages
4. Check server terminal for backend errors

## ⏱️ Time Estimate

| Task | Time |
|------|------|
| Setup (start servers) | 2 min |
| Test 1 (Submit idea) | 2 min |
| Test 2 (Approve idea) | 3 min |
| Test 3 (Voting) | 3 min |
| Test 4 (Committee workflow) | 5 min |
| Test 5 (Real-time) | 2 min |
| **Total** | **17 min** |

## 🎉 Success Criteria

After testing, you should have:
- ✅ Submitted at least 1 idea
- ✅ Approved at least 1 idea (as committee)
- ✅ Voted on at least 3 ideas
- ✅ Hit the 10-vote limit
- ✅ Promoted at least 1 idea to project
- ✅ Seen real-time updates work
- ✅ No major bugs or errors

**Ready to start testing? Let's go! 🚀**
