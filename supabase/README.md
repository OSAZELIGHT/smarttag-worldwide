# Supabase setup for SmartTag

This repository uses Supabase Auth, PostgreSQL and Storage. The application intentionally remains usable as a visual demo when Supabase is not configured.

## 1. Create a Supabase project

Create a project in the Supabase dashboard and keep its database password and any service-role key private. Do not paste a service-role key into the browser app or commit it to GitHub.

## 2. Apply the initial migration

For a new, empty project, open the SQL Editor and run:

`migrations/202611190001_initial_social_schema.sql`

The migration creates:
- Profiles and the Auth user profile-creation trigger.
- Posts, media metadata, comments and reactions.
- Follows with pending requests for private profiles.
- User blocks and visibility-aware read policies.
- Stories, communities, conversations, messages, notifications, hashtags and reports.
- Private `user-media`, `story-media` and `message-media` buckets with object policies.
- The `media_assets` table used by Smart Vault.

Do not run this as a repeatable seed script against a database that already has these objects. It is an initial schema migration, not an idempotent upgrade migration.

## 3. Configure the web app

Copy `.env.example` to `.env.local` for local development and provide:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the project's public anon/publishable key only. The Supabase client is created only when both values exist.

For Vercel, add the same two variables to the correct project environments and redeploy.

## 4. Configure Auth URLs

In Supabase Authentication settings, set the Site URL to the deployed app origin and add the local and production callback/redirect URLs you use. Configure email confirmation and password rules before inviting users.

## 5. Verify with separate test accounts

Use at least two test accounts and check:
- Sign-up creates exactly one profile and duplicate usernames fall back safely.
- Public posts are readable to signed-in users.
- Private profile posts and stories are readable only to the owner and accepted followers.
- Follow requests to private profiles stay pending until approved by the profile owner.
- Blocked users cannot view each other's profiles or content.
- A user can only upload, read, update and delete their own vault files.
- A file reference cannot be used to expose another account's private upload.
- Messages and message media are available only to conversation members.
- Reports are only visible to their reporter and authorized moderation tooling.

## Important limitations

The initial schema is a foundation and has not yet been applied or tested against a connected SmartTag Supabase project in this workspace. Production moderation roles, audit trails, rate limiting, notification fan-out, account deletion workflows, backups and formal policy tests remain required before public launch.
