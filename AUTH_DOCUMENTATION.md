# Authentication System

## Overview
Complete authentication system with MFA support and password management.

## Routes

### `/auth/login` - Sign In
- **Features:**
  - Email/password authentication
  - Remember me functionality
  - Show/hide password toggle
  - Two-factor authentication (MFA) support
  - SSO integration ready (Google, GitHub)
  - Responsive split-screen design
  
- **MFA Flow:**
  1. User enters email and password
  2. System validates credentials
  3. If MFA is enabled, user is prompted for 6-digit code
  4. Supports:
     - Manual code entry (auto-focus next input)
     - Paste entire 6-digit code at once
     - Resend code option
     - Backup code support

- **Security Features:**
  - Password visibility toggle
  - Secure token storage
  - Session management
  - Credential validation

### `/auth/register` - Create Account
- **Features:**
  - User registration form
  - Department selection
  - Password confirmation
  - Terms & conditions acceptance
  - Form validation
  - Responsive design

- **Form Fields:**
  - First Name & Last Name
  - Email Address
  - Department (Procurement, Finance, Operations, IT, HR, Other)
  - Password & Confirm Password
  - Terms acceptance checkbox

### `/auth/forgot-password` - Password Reset Request
- **Features:**
  - Email-based password reset
  - Clear step-by-step instructions
  - Success confirmation
  - Security notes about link expiration
  - Option to resend link

- **Reset Flow:**
  1. User enters email address
  2. System sends reset link via email
  3. User receives confirmation message
  4. Link expires in 1 hour for security

### `/auth/reset-password` - Set New Password
- **Features:**
  - Token validation from email link
  - Real-time password strength indicator
  - Password requirements checklist
  - Password confirmation matching
  - Success confirmation with auto-redirect

- **Password Requirements:**
  - Minimum 8 characters
  - Contains uppercase letter
  - Contains lowercase letter
  - Contains number
  - Contains special character

- **Strength Levels:**
  1. Very Weak (score 1/6)
  2. Weak (score 2/6)
  3. Fair (score 3/6)
  4. Good (score 4/6)
  5. Strong (score 5/6)
  6. Very Strong (score 6/6)

## Design Features

### Split-Screen Layout
- **Left Side:** Branding and information
  - Logo and system name
  - Feature highlights
  - Visual elements and patterns
  - Only visible on large screens (lg+)

- **Right Side:** Authentication form
  - Clean, focused form layout
  - Mobile-responsive
  - Dark mode support
  - Accessibility features

### User Experience
- Loading states on all buttons
- Clear error messages
- Success confirmations
- Helpful hints and tips
- Security warnings where appropriate
- Smooth transitions

### Responsive Design
- Desktop: Split-screen (50/50)
- Tablet: Full-width form with mobile logo
- Mobile: Optimized single-column layout

## Security Implementation

### Multi-Factor Authentication (MFA)
- 6-digit numeric code
- Auto-advance between input fields
- Paste support for convenience
- Code resend functionality
- Backup codes support
- Time-limited codes

### Password Security
- Strength calculation algorithm
- Visual strength indicator
- Requirements enforcement
- Confirmation matching
- Secure storage (ready for backend)

### Token Management
- Email-based reset tokens
- 1-hour expiration for security
- Token validation on reset page
- Invalid token handling

## Integration Points

### Ready for Backend
All pages are designed with API integration in mind:

```typescript
// Example API call structure
const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.requiresMFA) {
        setShowMFA(true);
    } else {
        // Store token and redirect
        localStorage.setItem('token', data.token);
        navigate('/');
    }
};
```

### State Management
- Redux integration for theme
- Local state for form management
- Session storage for authentication tokens
- Remember me functionality

## Testing the System

### Login Page
1. Navigate to `/auth/login`
2. Enter any email and password
3. Click "Sign In" → MFA screen appears
4. Enter 6-digit code (or paste)
5. Click "Verify & Sign In" → Redirects to dashboard

### Forgot Password Flow
1. Navigate to `/auth/forgot-password`
2. Enter email address
3. Click "Send Reset Link" → Success message
4. Navigate to `/auth/reset-password?token=test123`
5. Enter new password (meeting requirements)
6. Confirm password
7. Click "Reset Password" → Success and redirect to login

### Registration
1. Navigate to `/auth/register`
2. Fill in all required fields
3. Select department
4. Agree to terms
5. Click "Create Account" → Redirects to login

## Future Enhancements

- [ ] Email verification after registration
- [ ] Social login integration (Google, GitHub, Microsoft)
- [ ] Remember device for MFA
- [ ] Security questions as backup MFA
- [ ] Account lockout after failed attempts
- [ ] Password expiration policy
- [ ] Login history and activity tracking
- [ ] Device management
- [ ] Session management across devices
- [ ] Biometric authentication support

## Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus indicators
- Error announcements
- Form validation feedback
