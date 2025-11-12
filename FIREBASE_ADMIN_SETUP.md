# Firebase Admin SDK Setup Guide

## Current Status

The UniNexus application is currently running in **development mode** with fallback authentication enabled (`DEV_AUTH_ENABLED=true`).

### Server Log Output

```
Firebase authentication middleware ready
Firebase Admin SDK initialization failed: Failed to parse private key...
Firebase Admin SDK not configured. Using fallback authentication for development.
✓ Development authentication bypass enabled (DEV_AUTH_ENABLED=true)
```

This is **expected and working correctly** for local development.

---

## What Is Firebase Admin SDK?

Firebase Admin SDK is the backend service needed to:
- ✅ Verify Firebase user tokens on the server
- ✅ Create/manage user accounts programmatically
- ✅ Access Firebase services (Firestore, Storage, etc.)

**Note:** This is different from the Firebase web SDK (client-side) already configured in your `.env`.

---

## Two Authentication Modes

### Mode 1: Production (Firebase Admin SDK) 🔒
- Requires: Valid `serviceAccountKey.json` (service account credential file)
- Uses: Firebase Admin SDK for token verification
- When to use: Production deployments, real user management

### Mode 2: Development (Dev Auth Bypass) 🚀
- Requires: `DEV_AUTH_ENABLED=true` and `DEV_JWT_SECRET` in `.env`
- Uses: Simple JWT tokens for demo accounts
- **Status**: ✅ Currently Active
- When to use: Local development, testing, prototyping

---

## How to Set Up Firebase Admin SDK (Optional for Production)

### Step 1: Get Service Account JSON from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (uninexus-786ec)
3. Click **⚙️ Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in your project root

### Step 2: Replace the Placeholder

```bash
# Copy your downloaded service account to the project root
cp ~/Downloads/uninexus-786ec-*.json ~/Developer/UniNexusGenZ/serviceAccountKey.json
```

### Step 3: Restart Server

```bash
npm run dev
```

You should see:
```
✓ Firebase Admin SDK initialized successfully
Firebase authentication middleware ready
5:41:58 PM [express] serving on port 3000
```

---

## Important Security Notes ⚠️

### For Development
- `serviceAccountKey.json` is **already ignored** in `.gitignore`
- Dev auth uses hardcoded demo password (`demo123`) — **NEVER use in production**
- Keep `DEV_JWT_SECRET` secure but simple for testing (it's already in `.env`)

### For Production
- **Never commit** `serviceAccountKey.json` to git
- Use **environment secrets** in your deployment platform (Vercel, Railway, AWS, etc.)
- Set `DEV_AUTH_ENABLED=false` or leave unset
- Disable demo accounts

---

## Demo Account Login (Development Only)

As long as `DEV_AUTH_ENABLED=true`, you can log in with:

| Email | Password |
|-------|----------|
| demo.student@uninexus.app | demo123 |
| demo.teacher@uninexus.app | demo123 |
| demo.university@uninexus.app | demo123 |
| demo.industry@uninexus.app | demo123 |
| demo.admin@uninexus.app | demo123 |

---

## Testing Firebase Admin Configuration

Once you've added a valid `serviceAccountKey.json`, test it:

```bash
# Check if Firebase Admin initializes
npm run dev

# You should see:
# ✓ Firebase Admin SDK initialized successfully
```

---

## Troubleshooting

### Error: "Firebase Admin SDK not configured"
- **Normal in development** — means no valid service account found
- Falls back to dev auth automatically ✅

### Error: "Failed to parse private key"
- Service account JSON format is invalid
- Download a fresh one from Firebase Console
- Ensure file is in project root as `serviceAccountKey.json`

### Error: "DEV_JWT_SECRET must be set"
- Development auth enabled but secret missing
- Add to `.env`:
  ```
  DEV_AUTH_ENABLED=true
  DEV_JWT_SECRET=your-secure-random-secret-here
  ```

### Port 3000 already in use
```bash
# Kill the process on port 3000
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Or use a different port
PORT=4000 npm run dev
```

---

## Next Steps

### For Local Development ✅
- Keep `DEV_AUTH_ENABLED=true` in `.env`
- Use demo accounts to test features
- No need to set up Firebase Admin SDK

### For Production 🚀
1. Download real `serviceAccountKey.json` from Firebase Console
2. Store securely (environment variables in deployment platform)
3. Set `DEV_AUTH_ENABLED=false`
4. Deploy with proper credentials

---

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Console](https://console.firebase.google.com/)
- [Service Accounts Guide](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)

