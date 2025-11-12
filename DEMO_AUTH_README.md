# Development Authentication - Demo Accounts

## ⚠️ SECURITY WARNING ⚠️

**This development authentication system is NOT SECURE and should NEVER be used in production.**

## Purpose

This authentication bypass is designed for:
- Local development and testing
- Demonstrating multi-role features
- Quick prototyping without Firebase setup

## How It Works

When Firebase is not configured and `DEV_AUTH_ENABLED=true`:
1. Users can log in via `/api/auth/dev-login` endpoint
2. Only 5 allowlisted demo emails are accepted
3. All demo accounts use the password: `demo123`
4. JWT tokens expire after 24 hours

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| demo.student@uninexus.app | demo123 | student |
| demo.teacher@uninexus.app | demo123 | teacher |
| demo.university@uninexus.app | demo123 | university_admin |
| demo.industry@uninexus.app | demo123 | industry_professional |
| demo.admin@uninexus.app | demo123 | master_admin |

## Security Limitations

**Known vulnerabilities (acceptable for demo/testing only):**
1. **Shared Password**: All demo accounts use the same hard-coded password
2. **Password in Source**: The password is visible in the codebase
3. **Privilege Escalation**: Anyone with the password can access admin accounts
4. **No Rate Limiting**: No protection against brute force attempts
5. **Simple Audit Logs**: Only basic console logging

## Enabling Development Auth

Set these environment variables:

```bash
DEV_AUTH_ENABLED=true
DEV_JWT_SECRET=your-secure-random-secret-here
```

**IMPORTANT**: 
- DEV_AUTH_ENABLED must be explicitly set to 'true'
- DEV_JWT_SECRET is required (process will exit if missing)
- Only works when Firebase Admin SDK is not configured

## Production Use

**Never use this in production!** 

For production deployments:
1. Set up Firebase Authentication
2. Create real user accounts via Firebase Console
3. Set DEV_AUTH_ENABLED=false or leave it unset
4. Deploy with proper Firebase service account credentials

## Security Boundaries

Despite the limitations, these security measures are in place:

1. **Explicit Opt-In**: Must set `DEV_AUTH_ENABLED=true`
2. **Email Allowlist**: Only 5 specific demo emails can authenticate
3. **Fail-Safe**: Only activates when Firebase is unavailable
4. **Token Expiration**: JWTs expire after 24 hours
5. **Audit Logging**: All auth attempts are logged
6. **Secret Required**: Process exits if DEV_JWT_SECRET is missing

## Recommendations for Production

If you need demo accounts in production (not recommended):
1. Create real Firebase accounts for each demo email
2. Use strong, unique passwords per account
3. Store credentials in a secure password manager
4. Implement proper access controls and monitoring
5. Disable DEV_AUTH_ENABLED entirely
