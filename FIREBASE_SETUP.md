# Firebase Authentication Setup Guide

This document provides instructions for setting up Firebase Authentication with Google OAuth and Email/Password in UniNexus.

## Prerequisites

- A Firebase account ([console.firebase.google.com](https://console.firebase.google.com/))
- Firebase project credentials (already configured in Replit Secrets)

## Current Configuration

Firebase is already configured with the following secrets in Replit:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_PROJECT_ID`

## Firebase Console Setup

### 1. Enable Authentication Methods

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project (uninexus-786ec)
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the following providers:
   - **Email/Password**: Click "Email/Password" and toggle "Enable"
   - **Google**: Click "Google" and toggle "Enable"

### 2. Configure Authorized Domains

For the application to work correctly, you need to add your domains to Firebase's authorized domains list:

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add the following domains:
   - Your Replit development URL (e.g., `https://your-repl-name.repl.co`)
   - After deployment, add your production domain (e.g., `yourapp.replit.app` or custom domain)

> **Important**: Without adding these domains, Google OAuth and Firebase Authentication will be blocked by CORS.

### 3. Google Cloud Console Configuration (for Google OAuth)

If you encounter issues with Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project linked to your Firebase app
3. Navigate to **APIs & Services** → **Credentials**
4. Find the OAuth 2.0 Client ID for your Firebase app
5. Add Authorized JavaScript origins:
   - Your Replit dev URL
   - Your production URL
6. Add Authorized redirect URIs:
   - `https://<your-project-id>.firebaseapp.com/__/auth/handler`
   - Your custom domain redirect URIs if applicable

## Features Implemented

### ✅ Email/Password Authentication
- User registration with email and password
- Email/password login
- Role-based user creation (Student, Teacher, University Admin, Industry Professional, Master Admin)
- Profile data stored in database

### ✅ Google OAuth Authentication  
- Sign up with Google
- Sign in with Google
- Automatic user profile creation on first Google sign-in
- Default role assignment (Student) for Google sign-ins

### ✅ Demo Account System
- Pre-configured demo accounts for testing:
  - `demo.student@uninexus.app` (password: demo123)
  - `demo.teacher@uninexus.app` (password: demo123)
  - `demo.university@uninexus.app` (password: demo123)
  - `demo.industry@uninexus.app` (password: demo123)
  - `demo.admin@uninexus.app` (password: demo123)
- Demo accounts use development authentication (DEV_AUTH_ENABLED)

## How Authentication Works

### Client-Side Flow

1. **Firebase Initialization** (`client/src/lib/firebase.ts`):
   - Initializes Firebase app with environment variables
   - Creates auth instance and Google provider
   - Handles initialization failures gracefully

2. **Auth Context** (`client/src/lib/AuthContext.tsx`):
   - Provides authentication state and methods to the entire app
   - Manages both Firebase auth and demo account auth
   - Handles user data synchronization with backend

3. **Login/Register Pages**:
   - Email/password forms with validation
   - Google sign-in buttons
   - Error handling and user feedback

### Backend Flow

1. **Firebase Admin SDK** (`server/firebaseAuth.ts`):
   - Verifies Firebase ID tokens from clients
   - Optional: Can be configured with service account key for enhanced features
   - Falls back to development auth when not configured

2. **User Registration** (`/api/auth/register`):
   - Creates user profile in database
   - Associates Firebase UID with database user
   - Stores role and additional user data

3. **User Authentication** (`/api/auth/user`):
   - Retrieves user data based on Firebase token
   - Used by AuthContext to populate user state

## Testing Authentication

### Test Email/Password Signup

1. Navigate to `/register`
2. Fill in the registration form:
   - Full Name
   - Email (use a valid email format)
   - Password (minimum 6 characters)
   - Confirm Password
   - Select a role
   - Fill role-specific fields (university, major, company, etc.)
3. Click "Create Account"
4. You should be redirected to the home page as an authenticated user

### Test Email/Password Login

1. Navigate to `/login`
2. Enter credentials from a previously created account
3. Click "Sign In"
4. You should be authenticated and redirected

### Test Google OAuth

1. Navigate to `/login` or `/register`
2. Click "Sign in with Google" or "Sign up with Google"
3. Complete Google's OAuth flow
4. You should be authenticated and redirected
5. On first sign-in, a user profile is automatically created

### Test Demo Accounts

1. Navigate to `/login`
2. Use demo credentials (e.g., `demo.student@uninexus.app` / `demo123`)
3. Demo accounts bypass Firebase and use development authentication

## Deployment Checklist

Before deploying to production:

- [ ] Ensure all three Firebase secrets are set in production environment
- [ ] Add production domain to Firebase Authorized domains
- [ ] Add production domain to Google Cloud Console OAuth settings
- [ ] Test email/password registration in production
- [ ] Test Google OAuth in production
- [ ] Verify user data is being saved to database
- [ ] (Optional) Configure Firebase Admin SDK with service account key for enhanced security

## Optional: Firebase Admin SDK Setup

For enhanced server-side features (not required for basic auth):

1. In Firebase Console, go to **Project Settings** → **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `serviceAccountKey.json`
5. Place it in the root directory of your project
6. Add `serviceAccountKey.json` to `.gitignore` (already done)
7. Restart the server

The Firebase Admin SDK enables:
- Server-side token verification
- User management from backend
- Custom claims for authorization
- Enhanced security

## Troubleshooting

### "Firebase authentication is not configured"

**Cause**: Firebase secrets are missing or invalid

**Solution**: 
1. Verify secrets in Replit Secrets tab
2. Ensure all three required secrets are present
3. Restart the workflow after adding secrets

### Google Sign-In popup blocked or fails

**Cause**: Domain not authorized in Firebase

**Solution**:
1. Add your domain to Firebase Authorized domains
2. Add redirect URIs to Google Cloud Console
3. Clear browser cache and try again

### "Failed to create user profile"

**Cause**: Backend registration endpoint error

**Solution**:
1. Check server logs for errors
2. Verify database connection
3. Ensure user schema is up to date

### Demo accounts not working

**Cause**: Development auth not enabled or JWT secret missing

**Solution**:
1. Ensure `DEV_AUTH_ENABLED=true` in environment
2. Ensure `DEV_JWT_SECRET` is set to a secure string
3. Run `npm run db:seed` to create demo accounts

## Security Notes

- Firebase API keys are safe to expose on the client-side
- Backend validates all Firebase tokens before granting access
- Demo accounts should be disabled in production (set `DEV_AUTH_ENABLED=false`)
- Never commit `serviceAccountKey.json` to version control
- Use HTTPS for all authentication flows in production

## Support

For Firebase-specific issues, refer to:
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/web/setup)
- [Google OAuth Setup](https://firebase.google.com/docs/auth/web/google-signin)
