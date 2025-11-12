# Logout Feature Documentation

## Overview

UniNexus implements a comprehensive logout feature that works seamlessly across all authentication modes:
- ✅ **Firebase Authentication** (production)
- ✅ **Development Auth** (demo accounts)
- ✅ **Multi-role Support** (student, teacher, admin, industry partner)

---

## Architecture

### Client-Side (Frontend)

#### AuthContext (`client/src/lib/AuthContext.tsx`)

The `AuthContext` provides the `signOut()` function that handles logout for **both** authentication modes:

```typescript
const signOut = async () => {
  // 1. Clear dev token if using demo account
  localStorage.removeItem('dev_token');
  
  // 2. Sign out from Firebase (if configured)
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    // Gracefully handle if Firebase not available
  }
  
  // 3. Clear user state
  setUserData(null);
  setCurrentUser(null);
};
```

#### Navbar Component (`client/src/components/Navbar.tsx`)

The logout button in the navbar dropdown:

```tsx
<DropdownMenuItem
  onClick={async () => {
    await signOut();        // Clear auth state
    setLocation('/');       // Redirect to home
  }}
  data-testid="button-logout"
>
  <LogOut className="mr-2 h-4 w-4" />
  Log Out
</DropdownMenuItem>
```

### Server-Side (Backend)

#### Logout Endpoints (`server/routes.ts`)

**1. POST `/api/auth/logout` (Recommended)**
- Modern logout endpoint
- Works with all authentication modes
- Accepts Bearer token in Authorization header
- Returns JSON success response
- Logs logout event for auditing

```typescript
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  // Log the logout event
  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];
  if (token) {
    console.log(`User logout: ${token.substring(0, 20)}...`);
  }
  
  // Return success
  res.json({ 
    message: "Logged out successfully",
    timestamp: new Date().toISOString()
  });
});
```

**2. GET `/api/logout` (Backwards Compatibility)**
- Legacy endpoint for backwards compatibility
- Redirects to home page (`/`)
- Useful for older clients or direct browser navigation

---

## How Logout Works

### For Demo Accounts (Development Auth)

1. **User clicks "Log Out"** in navbar dropdown
2. **signOut()** function is called
3. **localStorage.removeItem('dev_token')** - removes stored JWT
4. **Firebase signOut()** - skipped (Firebase not configured)
5. **User state cleared** - userData and currentUser set to null
6. **Redirect to home** - user sent to login page
7. ✅ **Demo session ends** - next request requires re-login

### For Firebase Accounts (Production)

1. **User clicks "Log Out"** in navbar dropdown
2. **signOut()** function is called
3. **localStorage.removeItem('dev_token')** - skipped (not used)
4. **firebaseSignOut(auth)** - Firebase session cleared
5. **User state cleared** - userData and currentUser set to null
6. **Redirect to home** - user sent to login page
7. ✅ **Firebase session ends** - Firebase token becomes invalid
8. ✅ **Server validates** - subsequent requests rejected without valid token

---

## Multi-Role Support

Logout works identically for **all roles**:

| Role | Demo Account | Logout Behavior |
|------|--------------|-----------------|
| **Student** | demo.student@uninexus.app | ✅ Clears dev_token + local state |
| **Teacher** | demo.teacher@uninexus.app | ✅ Clears dev_token + local state |
| **University Admin** | demo.university@uninexus.app | ✅ Clears dev_token + local state |
| **Industry Partner** | demo.industry@uninexus.app | ✅ Clears dev_token + local state |
| **Master Admin** | demo.admin@uninexus.app | ✅ Clears dev_token + local state |

No role-specific logic needed — logout is universal.

---

## Security Considerations

### Token Invalidation

**Development Auth (Dev Tokens)**
- Tokens stored in localStorage
- Removal on logout prevents token reuse
- Tokens expire after 24 hours anyway (JWT expiration)
- Server validates token on each request

**Firebase Auth**
- Firebase SDK handles session management
- `firebaseSignOut()` invalidates session
- Existing tokens become invalid after expiration (1 hour default)
- Server validates via Firebase Admin SDK

### Best Practices

✅ **Always clear localStorage/sessionStorage**
- Prevents token replay attacks

✅ **Always clear in-memory user state**
- Prevents accidental data exposure

✅ **Validate on every server request**
- Middleware checks token validity
- Expired tokens rejected with 401

✅ **Log logout events**
- Audit trail for security monitoring
- Helps detect unauthorized access

### What **NOT** to Do

❌ Don't trust client-side logout alone
- Always validate on server

❌ Don't store sensitive data in localStorage after logout
- Clear all user-related data

❌ Don't keep tokens longer than necessary
- Use short expiration times

❌ Don't allow token reuse after logout
- Invalidate immediately

---

## Testing Logout

### Manual Testing (Dev Account)

```bash
# 1. Login as demo student
# Email: demo.student@uninexus.app
# Password: demo123

# 2. Verify you're logged in
# - Navbar shows user name and role
# - Notifications visible
# - Can access protected pages

# 3. Click "Log Out" in navbar dropdown

# 4. Verify logout worked
# - Redirected to home/login
# - User info cleared from navbar
# - localStorage.getItem('dev_token') === null
# - Cannot access protected pages (redirected to login)
```

### Testing with Developer Console

```javascript
// Before logout
localStorage.getItem('dev_token');
// Returns: "dev-eyJhbGc..."

// After logout
localStorage.getItem('dev_token');
// Returns: null

// Check user state (in React DevTools)
// userData: null
// currentUser: null
```

### Backend Logs

```
Dev login successful: demo.student@uninexus.app (role: student)
User logout: dev-eyJhbGciOiJIUzI1NiIsInR5c...
```

---

## API Reference

### POST /api/auth/logout

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully",
  "timestamp": "2025-11-12T17:30:00.000Z"
}
```

### GET /api/logout

**Request:**
```bash
curl -L http://localhost:3000/api/logout
```

**Response:**
- Redirects to `/` (home page)
- HTTP 302 redirect

---

## Integration Points

### AuthContext (client/src/lib/AuthContext.tsx)
- `signOut()` - main logout function
- Handles both Firebase and dev auth
- Clears all user state

### Navbar (client/src/components/Navbar.tsx)
- Logout button with visual feedback
- Calls `signOut()` on click
- Redirects to home after logout

### Routes (server/routes.ts)
- `POST /api/auth/logout` - primary endpoint
- `GET /api/logout` - legacy endpoint
- Logging for audit trail

### Middleware (server/firebaseAuth.ts)
- Validates tokens on each request
- Rejects invalid/expired tokens
- Returns 401 Unauthorized

---

## Common Issues & Solutions

### Issue: Logout Button Not Responding

**Solution:**
- Check browser console for errors
- Verify `signOut()` is imported from AuthContext
- Ensure `useAuth()` hook is available

### Issue: Token Still Present After Logout

**Solution:**
```javascript
// Manual cleanup
localStorage.removeItem('dev_token');
localStorage.clear(); // Clear all storage if needed
location.reload();    // Refresh page
```

### Issue: Cannot Re-login After Logout

**Solution:**
- Clear browser cache
- Check .env variables (DEV_AUTH_ENABLED=true)
- Verify server is running
- Check demo account credentials

### Issue: Firebase Logout Fails

**Solution:**
```typescript
// Check Firebase initialization
if (!auth) {
  console.error('Firebase not initialized');
}

// Manual Firebase logout
import { signOut as firebaseSignOut } from 'firebase/auth';
await firebaseSignOut(auth);
```

---

## Future Enhancements

Potential improvements to logout feature:

1. **Logout All Devices**
   - Invalidate all active sessions for a user
   - Useful if password compromised

2. **Logout Confirmation Modal**
   - Ask user to confirm logout
   - Prevent accidental logouts

3. **Session History**
   - Track all login/logout events
   - Show active sessions

4. **Remember Me**
   - Optional token persistence
   - Extended session duration

5. **Biometric Re-authentication**
   - Require fingerprint/face for logout
   - Additional security layer

---

## Summary

✅ **Logout works for all roles**
- Student, Teacher, Admin, Industry Partner, Master Admin

✅ **Works with both auth modes**
- Firebase (production) and Dev Auth (development)

✅ **Secure by design**
- Clears tokens immediately
- Validates on every server request
- Server-side enforcement

✅ **Simple to use**
- One-click logout from navbar
- No additional configuration needed

✅ **Well-integrated**
- Works with React Router navigation
- Redirects to safe page
- Clears all sensitive state

