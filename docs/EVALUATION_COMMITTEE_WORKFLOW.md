# Evaluation Committee Workflow

## Overview

The Evaluation Committee system now includes a robust section-by-section verification workflow. Each section (A through E) must be verified by the committee before the next section can be unlocked.

## Section Verification States

Each section can be in one of these states:

1. **NOT_STARTED** - Section hasn't been worked on yet
2. **IN_PROGRESS** - Section is being filled out
3. **SUBMITTED** - Section submitted for committee review
4. **RETURNED** - Committee returned section with change requests
5. **VERIFIED** - Committee approved the section

## Workflow Process

### For Procurement Officers/Evaluators:

1. **Fill Section Data** - Complete section A first
2. **Submit for Review** - Click "Submit for Review" button
3. **Wait for Committee** - Section moves to SUBMITTED status
4. **Handle Returns** - If returned, review committee notes and make changes
5. **Resubmit** - Submit again after making requested changes
6. **Move to Next Section** - Once verified, next section unlocks

### For Committee Members:

1. **Review Submitted Sections** - View sections in SUBMITTED status
2. **Add Verification Notes** - Provide feedback (optional for approval, required for return)
3. **Take Action**:
    - **Verify** - Approve the section (changes status to VERIFIED)
    - **Return** - Send back for changes with detailed notes (changes status to RETURNED)
4. **Unlock Next Section** - Verification automatically unlocks the next section

## Section Locking Logic

-   **Section A** is always unlocked (starting point)
-   **Section B** unlocks only after Section A is VERIFIED
-   **Section C** unlocks only after Section B is VERIFIED
-   **Section D** unlocks only after Section C is VERIFIED
-   **Section E** unlocks only after Section D is VERIFIED

## Database Schema

### New Fields Added to Evaluation Model:

For each section (A, B, C, D, E):

-   `section{X}Status` - Current verification status
-   `section{X}VerifiedBy` - User ID who verified/returned
-   `section{X}Verifier` - User relation for verifier details
-   `section{X}VerifiedAt` - Timestamp of verification action
-   `section{X}Notes` - Committee notes/feedback

### New Enum:

```prisma
enum SectionVerificationStatus {
  NOT_STARTED
  IN_PROGRESS
  SUBMITTED
  RETURNED
  VERIFIED
}
```

## API Endpoints

### Submit Section for Review

```
POST /api/evaluations/:id/sections/:section/submit
```

Changes section status from IN_PROGRESS/RETURNED to SUBMITTED.

### Verify Section (Committee Only)

```
POST /api/evaluations/:id/sections/:section/verify
Body: { notes?: string }
```

Changes section status to VERIFIED, records committee member and timestamp.

### Return Section (Committee Only)

```
POST /api/evaluations/:id/sections/:section/return
Body: { notes: string } // Required
```

Changes section status to RETURNED, records feedback for evaluator.

## Frontend Integration

### Services (`evaluationService.ts`):

-   `submitSection(id, section)` - Submit for review
-   `verifySection(id, section, notes)` - Committee approval
-   `returnSection(id, section, notes)` - Committee return

### Component (`EvaluationCommittee.tsx`):

-   Real-time section status display
-   Lock/unlock visual indicators (🔒)
-   Color-coded status badges
-   Committee verification interface
-   Return notes display

## User Experience

### Visual Indicators:

-   🔒 **Locked sections** - Gray, not clickable
-   ✓ **Verified sections** - Green checkmark
-   📋 **Submitted sections** - Blue info badge
-   ⚠️ **Returned sections** - Red warning with notes
-   1,2,3... **Active sections** - Numbered circles

### Status Colors:

-   **VERIFIED** - Green (success)
-   **SUBMITTED** - Blue (info)
-   **IN_PROGRESS** - Yellow (warning)
-   **RETURNED** - Red (danger)
-   **NOT_STARTED** - Gray (secondary)

## Benefits

1. **Quality Control** - Committee reviews each section before moving forward
2. **Transparency** - Clear status tracking and audit trail
3. **Accountability** - Records who verified/returned with timestamps
4. **Feedback Loop** - Return mechanism with required notes ensures clear communication
5. **Sequential Progress** - Prevents skipping ahead without proper review

## Migration

Run the migration:

```bash
cd server
npx prisma migrate dev --name add_section_verification_workflow
```

This adds all necessary columns and relations to the database.
