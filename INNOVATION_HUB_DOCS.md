# Innovative Hub Feature Documentation

## 🎯 Overview

The **Innovative Hub (IH)** is a new module integrated into the SPINX PMS system that allows Bureau of Standards Jamaica staff to submit, vote on, and promote innovative ideas to official BSJ projects.

## ✨ Features

### For All Users
- ✅ Submit new ideas with detailed descriptions
- ✅ Browse and vote on approved ideas
- ✅ View popular and trending innovations
- ✅ Track your own submissions
- ✅ Comment on ideas (future enhancement)
- ✅ View idea categories (Technology, Sustainability, Customer Service, etc.)

### For Innovation Committee
- ✅ Review pending idea submissions
- ✅ Approve or reject ideas with feedback
- ✅ Promote popular ideas to official BSJ projects
- ✅ Manage project codes and tracking
- ✅ View statistics and analytics

## 🗄️ Database Schema

### New Tables

#### **Idea**
- `id` - Unique identifier (cuid)
- `title` - Idea title (required)
- `description` - Detailed description
- `category` - IdeaCategory enum
- `status` - IdeaStatus enum
- `submittedBy` - User ID of submitter
- `submittedAt` - Submission timestamp
- `reviewedBy` - Committee member who reviewed
- `reviewedAt` - Review timestamp
- `reviewNotes` - Feedback from committee
- `promotedAt` - Promotion timestamp (if promoted)
- `projectCode` - BSJ project code (if promoted)
- `voteCount` - Total votes received
- `viewCount` - Total views

#### **Vote**
- `id` - Auto-increment ID
- `ideaId` - Reference to Idea
- `userId` - User who voted
- `createdAt` - Vote timestamp
- Unique constraint on (ideaId, userId) - one vote per user per idea

#### **IdeaComment**
- `id` - Auto-increment ID
- `ideaId` - Reference to Idea
- `userId` - Comment author
- `text` - Comment content
- `createdAt` - Comment timestamp

#### **IdeaAttachment**
- `id` - Auto-increment ID
- `ideaId` - Reference to Idea
- `fileName` - Original filename
- `fileUrl` - Storage URL
- `fileSize` - Size in bytes
- `mimeType` - File type
- `uploadedAt` - Upload timestamp

### Enums

#### **IdeaStatus**
- `DRAFT` - Saved but not submitted
- `PENDING_REVIEW` - Awaiting committee review
- `APPROVED` - Approved for voting
- `REJECTED` - Rejected by committee
- `PROMOTED_TO_PROJECT` - Promoted to BSJ project

#### **IdeaCategory**
- `PROCESS_IMPROVEMENT`
- `TECHNOLOGY`
- `CUSTOMER_SERVICE`
- `SUSTAINABILITY`
- `COST_REDUCTION`
- `PRODUCT_INNOVATION`
- `OTHER`

#### **Role** (Extended)
Added `INNOVATION_COMMITTEE` to existing USER, MANAGER, ADMIN roles.

## 🛣️ Routes

### Public Routes (After Login)
- `/` - Module Selector (choose PMS or IH)

### Innovation Hub Routes
- `/innovation/dashboard` - Main IH dashboard
- `/innovation/ideas/new` - Submit new idea form
- `/innovation/ideas/browse` - Browse all approved ideas
- `/innovation/ideas/mine` - Your submitted ideas
- `/innovation/ideas/popular` - Trending ideas
- `/innovation/ideas/:id` - Idea detail view (future)

### Committee Routes
- `/innovation/committee` - Committee dashboard
- `/innovation/committee/review/:id` - Review specific idea (future)

## 📁 File Structure

```
src/
├── pages/
│   ├── ModuleSelector.tsx              # Landing page after login
│   └── Innovation/
│       ├── InnovationDashboard.tsx      # Main IH dashboard
│       ├── Ideas/
│       │   ├── SubmitIdea.tsx           # Submit new idea form
│       │   └── BrowseIdeas.tsx          # Browse & vote on ideas
│       └── Committee/
│           └── CommitteeDashboard.tsx   # Committee review dashboard
├── utils/
│   └── auth.ts                          # Auth helpers (remember me)
└── router/
    └── routes.tsx                       # All route definitions

prisma/
└── schema.prisma                        # Database schema with IH models

scripts/
└── seedInnovation.ts                    # Demo data seeder
```

## 🚀 Getting Started

### 1. Database Setup

The schema has already been pushed to your MySQL database. If you need to re-sync:

```powershell
npm run prisma:db-push
```

### 2. Seed Demo Data

Load 10 sample ideas into the database:

```powershell
npm run innovation:seed
```

This creates:
- 7 approved ideas (ready for voting)
- 2 pending ideas (awaiting committee review)
- 1 promoted idea (converted to BSJ project)

### 3. Start the App

```powershell
# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the dev server
npm run dev
```

### 4. Login & Explore

1. Navigate to http://localhost:5173
2. Login with:
   - Email: `admin@example.com`
   - Password: `Password123!`
3. You'll see the **Module Selector** - choose "Innovative Hub"
4. Explore the dashboard, browse ideas, and submit your own!

## 💡 Usage Guide

### As a Regular User

#### Submit an Idea
1. Click **"Submit New Idea"** on dashboard or browse page
2. Fill in:
   - Title (concise, descriptive)
   - Category (select from dropdown)
   - Detailed description
   - Expected benefits
   - Implementation notes (optional)
3. Click **"Submit Idea"**
4. Your idea will be pending committee review

#### Vote on Ideas
1. Go to **"Browse Ideas"**
2. View approved ideas
3. Click the **thumbs-up button** to vote
4. Click again to remove your vote
5. Ideas with more votes are more likely to be promoted!

#### Track Your Ideas
1. Click **"My Submissions"** from dashboard
2. See all your ideas with their status:
   - ⏳ Pending Review
   - ✅ Approved
   - ❌ Rejected
   - 🚀 Promoted to Project

  ## 📸 Image Upload in Idea Submission (Added 2025-11-10)

  You can attach an optional image when submitting a new idea.

  - Frontend: The form at `src/pages/Innovation/Ideas/SubmitIdea.tsx` accepts an image, shows a preview, and submits using `multipart/form-data` via `submitIdea()`.
  - API: `POST /api/ideas` now supports `multipart/form-data` with a single file field named `image`. If provided, the file is validated (image mimetype) and limited to 5MB.
  - Storage: Uploaded files are saved to `/uploads` and served statically at `/uploads/<filename>`.
  - Database: An `IdeaAttachment` row is created with metadata and `fileUrl` pointing to the uploaded file.

  Request fields (multipart):
  - title (required)
  - description (required)
  - category (required; IdeaCategory enum value)
  - expectedBenefits (optional)
  - implementationNotes (optional)
  - image (optional, single file)

  Client event: After a successful submit, the app dispatches `idea:created` CustomEvent so the "My Ideas" page can optimistically reflect the new idea before polling refresh.

  Future enhancements:
  - Return attachments in the creation response
  - Multiple file uploads
  - Image deletion & lifecycle cleanup
  - Thumbnails and image optimization

  ## 📎 Attachment Retrieval (Added 2025-11-10)

  You can request ideas with their attachments included using a query parameter.

  - List: `GET /api/ideas?include=attachments`
  - Single: `GET /api/ideas/:id?include=attachments`

  Response will include an `attachments` array with `{ id, fileName, fileUrl, fileSize, mimeType, uploadedAt }`.
  On the frontend, `fetchIdeas({ includeAttachments: true })` and `fetchIdeaById(id, { includeAttachments: true })` populate `idea.attachments` and a convenience `firstAttachmentUrl`.

### As Innovation Committee Member

#### Review Pending Ideas
1. Access **Committee Dashboard** (role: INNOVATION_COMMITTEE)
2. View all pending submissions
3. Click **"View Full Details"** for in-depth review
4. Click **"Approve"** to make it visible for voting
5. Click **"Reject"** and provide feedback to submitter

#### Promote Ideas to Projects
1. Go to **"Approved"** tab
2. Review ideas with high vote counts
3. Click **"Promote to Project"**
4. Enter a project code (e.g., BSJ-PROJ-2025-001)
5. Idea is now officially a BSJ project!

## 🎨 Frontend Best Practices Demonstrated

### Component Structure
- **Separation of Concerns**: Each page has a single responsibility
- **Reusable Patterns**: Category badges, vote buttons, status indicators
- **Consistent Layout**: All pages use the panel system from your design system

### State Management
- Local state with `useState` for form data
- Redux for page titles
- Navigate with React Router for seamless transitions

### UX Enhancements
- **Loading States**: Disabled buttons with spinners during API calls
- **SweetAlert2**: Beautiful modals for confirmations and success messages
- **Empty States**: Helpful messages when no data exists
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Dark Mode Support**: All components respect dark theme

### TypeScript Usage
- Proper interfaces for data shapes
- Type-safe enums for categories and statuses
- Null safety with optional chaining

### Accessibility
- Semantic HTML
- Proper form labels and aria attributes
- Keyboard navigation support
- Color contrast compliance

## 🔮 Future Enhancements

### Phase 2
- [ ] Idea detail page with full description and comments
- [ ] Comment system for discussions
- [ ] File attachments (images, PDFs, mockups)
- [ ] My Ideas page (dedicated view, not shared with Browse)
- [ ] Popular ideas page with trending algorithm

### Phase 3
- [ ] Email notifications (idea approved, promoted, etc.)
- [ ] Real-time voting updates
- [ ] Idea search and advanced filters
- [ ] Analytics dashboard for committee
- [ ] Export ideas to PDF/Excel

### Phase 4
- [ ] Idea collaboration (co-submitters)
- [ ] Idea versioning (edit submitted ideas)
- [ ] Integration with project management tools
- [ ] Mobile app for IH
- [ ] Gamification (badges, leaderboards)

## 🧪 Testing

### Manual Testing Checklist

**User Flow:**
- [ ] Login redirects to Module Selector
- [ ] Can navigate to Innovation Hub
- [ ] Dashboard shows correct stats
- [ ] Can submit a new idea
- [ ] Can browse approved ideas
- [ ] Can vote on an idea
- [ ] Vote count updates immediately
- [ ] Can view own submissions

**Committee Flow:**
- [ ] Committee dashboard shows pending ideas
- [ ] Can approve an idea
- [ ] Can reject an idea with notes
- [ ] Can promote idea to project
- [ ] Stats update after actions

**Edge Cases:**
- [ ] Cannot vote twice on same idea
- [ ] Form validation works
- [ ] Handles empty states gracefully
- [ ] Works in dark mode
- [ ] Responsive on mobile

## 📊 Database Queries

### Get Approved Ideas
```typescript
const ideas = await prisma.idea.findMany({
  where: { status: 'APPROVED' },
  orderBy: { voteCount: 'desc' },
  include: { votes: true, comments: true }
});
```

### Submit Vote
```typescript
await prisma.vote.create({
  data: {
    ideaId: 'idea-id-here',
    userId: 'user-id-here'
  }
});
await prisma.idea.update({
  where: { id: 'idea-id-here' },
  data: { voteCount: { increment: 1 } }
});
```

### Committee Approval
```typescript
await prisma.idea.update({
  where: { id: 'idea-id-here' },
  data: {
    status: 'APPROVED',
    reviewedBy: 'committee-user-id',
    reviewedAt: new Date()
  }
});
```

## 🎓 Learning Points

### As Your Mentor, Here's What You Should Know:

1. **Component Composition**: Notice how we built reusable patterns (vote button, category badges) that can be extracted into shared components later.

2. **State Management**: We used local state for most pages since the data doesn't need to be global. Redux is only for the page title.

3. **Route Organization**: Routes are grouped by feature (auth, procurement, innovation) making it easy to find and maintain.

4. **Database Relations**: The Prisma schema shows clean relationships between users, ideas, votes, and comments.

5. **User Experience**: Always show loading states, provide feedback (SweetAlert), and handle empty states gracefully.

6. **TypeScript Benefits**: Enums prevent typos, interfaces catch bugs early, and the compiler is your friend!

7. **Incremental Development**: We built the core features first (submit, browse, vote, review). Advanced features (comments, attachments) come later.

## 📝 Notes

- **Remember Me**: Already implemented in the auth system (sessionStorage vs localStorage)
- **Microsoft SSO**: Fully functional, requires Azure app registration
- **Module Selector**: Clean separation between PMS and IH - easy to add more modules later!
- **Scalability**: Database indexes on `status`, `category`, `voteCount` ensure fast queries even with 1000s of ideas

## 🤝 Contributing

When adding new features:
1. Update the database schema in `prisma/schema.prisma`
2. Run `npm run prisma:db-push`
3. Create the page component in appropriate folder
4. Add route to `src/router/routes.tsx`
5. Test thoroughly before committing

---

**Built with ❤️ by the BSJ Innovation Team**

Questions? Contact the development team or check the main README.md for general PMS documentation.
