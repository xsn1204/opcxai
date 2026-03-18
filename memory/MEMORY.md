# OPC-AI Project Memory

## Project Stack
- Next.js 16 (App Router), React 19, TypeScript
- Prisma ORM with SQLite (file:./dev.db)
- Auth: bcryptjs password hashing + jose JWT in httpOnly cookie (COOKIE_NAME)
- Styling: Tailwind CSS v4, custom components in src/components/ui/

## Key File Paths
- Auth API: src/app/api/auth/{login,logout,me,register}/route.ts
- Email service: src/lib/email.ts (nodemailer + in-memory code/verified stores)
- Email verify APIs: src/app/api/auth/{send-verify-code,verify-code}/route.ts
- Corp register: src/app/register/corp/page.tsx
- Talent register: src/app/register/talent/page.tsx
- DB client: src/lib/db.ts

## Email Verification System (added 2026-03-10)
- send-verify-code: generates 6-digit code, stores in Map with 5-min TTL, sends via Aliyun SMTP
- verify-code: validates code, marks email as verified in a separate Map (10-min TTL)
- register route: checks isEmailVerified(email) before DB write, consumes token after
- Fallback: if EMAIL_PASS is empty, prints code to console (no crash)
- SMTP config in .env: EMAIL_USER, EMAIL_PASS, EMAIL_HOST=smtpdm.aliyun.com

## Register Page Flows
- Corp (/register/corp): 2 steps. Step 1 has email verify before "下一步" is allowed.
- Talent (/register/talent): 3 steps (step 0 = identity select, step 1 = basic info + email verify, step 2 = profile).

## Conventions
- Chinese UI text throughout
- DarkInput component used in talent page (dark theme); standard Input component in corp page (light theme)
- Error display: red box with border, inline in forms
