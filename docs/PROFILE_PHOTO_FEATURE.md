# Profile Photo Upload & LDAP Sync Feature

## Overview

Users can now upload and manage their profile photos in two ways:

1. **Manual Upload** - Upload custom photos from their device
2. **Active Directory Sync** - Pull their official AD photo with one click

## Features Implemented

### 1. Manual Photo Upload

-   **Location**: User Profile page (`/profile`)
-   **File Requirements**:
    -   Supported formats: JPEG, JPG, PNG, GIF, WebP
    -   Maximum file size: 5MB
    -   Images automatically validated on frontend and backend
-   **UI**: Two dedicated buttons below profile photo:
    -   **Upload Photo** (Blue) - Opens file picker for custom uploads
    -   **Sync from AD** (Green) - Syncs photo from Active Directory
-   **Functionality**:
    -   Upload: Click button → select image → automatic upload and preview
    -   LDAP Sync: Click button → photo pulled from AD → automatic update

### 2. LDAP Photo Sync (Enhanced)

**Automatic Sync (On Login):**

-   Profile photos retrieved from Active Directory's `thumbnailPhoto` attribute
-   Sync Timing: During login authentication
-   Behavior:
    -   New users: Photo set from LDAP on first login
    -   Existing users: Photo synced from LDAP if they don't have a profile image
    -   Manual uploads take precedence (not overwritten by LDAP on login)

**Manual Sync (New Feature):**

-   **Button**: "Sync from AD" button on Profile page
-   **Purpose**: Users can manually pull their latest AD photo anytime
-   **Requirements**:
    -   User must be linked to Active Directory (`ldapDN` exists)
    -   LDAP must be configured on server
    -   User must have a photo in AD (`thumbnailPhoto` attribute)
-   **Behavior**:
    -   Replaces current profile photo with AD photo
    -   Deletes old custom uploads (keeps LDAP consistency)
    -   Updates instantly across all UI components
-   **Error Handling**:
    -   Shows friendly messages if LDAP not configured
    -   Shows friendly messages if user not linked to AD
    -   Shows friendly messages if no photo in AD

### 3. Profile Image Display

-   **Header**: User avatar in top-right dropdown menu
-   **Profile Page**: Large avatar with upload functionality
-   **Size**: Responsive sizing (24x24 in header, larger on profile page)
-   **Fallback**: Default user-profile.jpeg if no photo set

## Technical Implementation

### Backend Changes

#### 1. Database Schema (`server/prisma/schema.prisma`)

```prisma
model User {
  // ... existing fields
  profileImage String?  // Relative path to profile photo
}
```

#### 2. LDAP Service (`server/services/ldapService.ts`)

-   Added `profileImage` to `LDAPUser` interface
-   Modified search queries to include `thumbnailPhoto` attribute
-   New method: `saveLDAPPhoto()` - saves LDAP binary photo to disk
-   Photos stored as: `/uploads/profiles/ldap-{email}-{timestamp}.jpg`

#### 3. LDAP Role Sync (`server/services/ldapRoleSyncService.ts`)

-   Updated `syncLDAPUserToDatabase()` to save LDAP profile image
-   Creates new users with LDAP photo
-   Updates existing users if they don't have a profile image

#### 4. Auth Routes (`server/routes/auth.ts`)

-   **New Endpoint**: `POST /auth/upload-photo`
    -   Accepts multipart/form-data with `photo` field
    -   Validates file type and size
    -   Deletes old profile photo before saving new one
    -   Returns updated profile image path
-   **New Endpoint**: `POST /auth/sync-ldap-photo` ⭐ NEW
    -   Syncs user's profile photo from Active Directory
    -   Requires user to be linked to AD (`ldapDN` exists)
    -   Retrieves `thumbnailPhoto` from LDAP
    -   Replaces current photo with AD photo
    -   Returns updated profile image path
-   **Updated Endpoint**: `GET /auth/me`
    -   Now includes `profileImage` field in response
-   **Multer Configuration**:
    -   Storage destination: `uploads/profiles/`
    -   Filename pattern: `user-{userId}-{timestamp}.{ext}`
    -   File size limit: 5MB
    -   Type validation: Images only

#### 5. Static File Serving (`server/index.ts`)

-   `/uploads` route already serving profile photos via `express.static()`
-   Photos accessible at: `http://localhost:4000/uploads/profiles/{filename}`

### Frontend Changes

#### 1. Profile Page (`src/pages/Procurement/Users/Profile.tsx`)

-   **New State**:
    -   `uploadingPhoto` - loading indicator during upload
    -   `syncingLDAPPhoto` - loading indicator during LDAP sync ⭐ NEW
-   **New Handlers**:
    -   `handlePhotoUpload()` - validates and uploads photo
    -   `handleSyncLDAPPhoto()` - syncs photo from Active Directory ⭐ NEW
-   **UI Updates**:
    -   Profile image displays from `profileImage` field
    -   Two action buttons below photo:
        -   "Upload Photo" button (blue outline)
        -   "Sync from AD" button (green outline) ⭐ NEW
    -   Upload progress indicators (spinners)
    -   SweetAlert2 toast notifications for success/error
-   **Image Source**: Constructs full URL using `getApiUrl()` helper
-   **Cache Busting**: Adds timestamp query param to force image reload

#### 2. Header Component (`src/components/Layouts/Header.tsx`)

-   **New State**: `profileImage` - stores user's profile photo path
-   **New Effect**: Fetches profile image from `/auth/me` on mount
-   **UI Updates**:
    -   Avatar button displays user's profile photo
    -   Dropdown menu shows profile photo with user info
    -   Falls back to default image if none set
-   **Image Source**: Constructs full URL using `getApiUrl()` helper

## File Storage Structure

```
uploads/
  profiles/
    user-{userId}-{timestamp}.jpg     # Manual uploads
    ldap-{email}-{timestamp}.jpg      # LDAP synced photos
```

## Security Considerations

✅ **File Validation**: Type and size checked on frontend and backend
✅ **Authentication Required**: Upload endpoint requires valid JWT token
✅ **Old File Cleanup**: Previous profile photos deleted before new upload
✅ **Path Sanitization**: Email addresses sanitized for filenames
✅ **Storage Limits**: 5MB per image prevents abuse
✅ **Safe Deletion**: Old files only deleted if they exist on disk

## API Endpoints

### 1. Upload Profile Photo

```
POST /auth/upload-photo
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
  photo: (file)

Response:
{
  "success": true,
  "profileImage": "/uploads/profiles/user-123-1234567890.jpg"
}
```

### 2. Sync Photo from Active Directory ⭐ NEW

```
POST /auth/sync-ldap-photo
Authorization: Bearer {token}
Content-Type: application/json

Response (Success):
{
  "success": true,
  "profileImage": "/uploads/profiles/ldap-user-email-1234567890.jpg",
  "message": "Profile photo synced from Active Directory"
}

Response (Error - Not linked to AD):
{
  "success": false,
  "message": "This account is not linked to Active Directory"
}

Response (Error - No AD photo):
{
  "success": false,
  "message": "No profile photo found in Active Directory"
}

Response (Error - LDAP not configured):
{
  "success": false,
  "message": "LDAP is not configured on this server"
}
```

### 3. Get User Profile (includes photo)

```
GET /auth/me
Authorization: Bearer {token}

Response:
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["REQUESTER"],
  "department": {...},
  "profileImage": "/uploads/profiles/user-123-1234567890.jpg"
}
```

## Testing Checklist

-   [ ] Upload photo from profile page
-   [ ] Verify photo appears in header immediately after upload
-   [ ] Click "Sync from AD" button (if LDAP configured)
-   [ ] Verify AD photo replaces custom photo
-   [ ] Verify photo appears in header immediately after sync
-   [ ] Login with LDAP account that has thumbnailPhoto
-   [ ] Verify LDAP photo syncs on first login
-   [ ] Verify manual upload overwrites LDAP photo
-   [ ] Try syncing when not linked to AD (should show error)
-   [ ] Try syncing when LDAP not configured (should show error)
-   [ ] Try syncing when no AD photo exists (should show error)
-   [ ] Test with different image formats (JPG, PNG, GIF, WebP)
-   [ ] Test file size validation (>5MB should fail)
-   [ ] Test invalid file types (PDF, TXT should fail)
-   [ ] Verify old photos are deleted when uploading new ones
-   [ ] Check responsive display on mobile devices

## Future Enhancements

1. **Image Cropping**: Add client-side cropping before upload
2. **Photo Gallery**: Allow multiple photos and profile backgrounds
3. **Compression**: Automatic image optimization/compression
4. **Thumbnails**: Generate multiple sizes for different UI contexts
5. **CDN Integration**: Serve images from CDN for better performance
6. **Admin Override**: Allow admins to set/remove user photos
7. **LDAP Refresh**: Periodic sync to update photos from LDAP

## Known Limitations

-   No automatic LDAP re-sync after initial login (only on authentication)
-   Old LDAP photos not cleaned up (accumulate in uploads/profiles/)
-   No image compression (large photos stored as-is)
-   No profile photo in supplier interface (supplier users don't have access to profile page)

## Troubleshooting

### Photo not displaying

1. Check browser console for 404 errors on image URL
2. Verify `/uploads` folder exists and is readable
3. Check `profileImage` field in database (should start with `/uploads/profiles/`)
4. Ensure static file serving is configured in `server/index.ts`

### Upload fails

1. Check file size (must be <5MB)
2. Verify file type is image (JPEG, PNG, GIF, WebP)
3. Ensure user is authenticated (valid JWT token)
4. Check server logs for multer errors
5. Verify `uploads/profiles/` directory exists and is writable

### LDAP photo not syncing

1. Verify Active Directory user has `thumbnailPhoto` attribute set
2. Check LDAP search attributes include `thumbnailPhoto`
3. Review server logs during authentication for LDAP errors
4. Ensure user doesn't already have a manual profile photo

## Related Files

**Backend:**

-   `server/prisma/schema.prisma` - Database schema
-   `server/routes/auth.ts` - Upload and profile endpoints
-   `server/services/ldapService.ts` - LDAP photo retrieval
-   `server/services/ldapRoleSyncService.ts` - LDAP photo sync logic

**Frontend:**

-   `src/pages/Procurement/Users/Profile.tsx` - Upload UI and profile display
-   `src/components/Layouts/Header.tsx` - Header avatar display
-   `src/config/api.ts` - API URL helper functions

**Storage:**

-   `uploads/profiles/` - Photo storage directory
