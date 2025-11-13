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
