# SmartTag Worldwide

**One connected world. Every way to share.**

SmartTag Worldwide is an all-in-one social media and digital community platform being developed by **GC Smart Technology**. It brings familiar social experiences—personal feeds, photo and video sharing, short-form video, stories, messaging, groups, creator communities and discovery—into one connected platform.

SmartTag is not a camera-only application. Camera capture, media identification, tagging and the Smart Vault are distinctive capabilities within a much broader social network.

## Product vision

Give people one place to:
- Create a profile and build their digital identity.
- Connect with friends, follow creators and join communities.
- Publish text updates, photographs and videos.
- Share temporary stories and discover short-form videos.
- React, comment, share and have conversations.
- Send private messages and receive notifications.
- Create and manage groups, pages and creator spaces.
- Search people, posts, topics and communities.
- Capture media, organize it with SmartTags and keep it in a personal media vault.
- Manage privacy, safety and account settings.

## Product pillars

| Pillar | What it includes |
| --- | --- |
| Social identity | Accounts, profiles, followers, friends and verification |
| Feed and publishing | Text, image, video, reactions, comments and sharing |
| Stories and short video | Time-limited stories, vertical video and creator tools |
| Communication | Direct messages, group conversations and notifications |
| Communities | Groups, pages, events and shared-interest spaces |
| Discovery | Search, hashtags, recommendations and trending topics |
| SmartTag technology | Camera capture, media tagging, identification and Smart Vault |
| Trust and safety | Privacy controls, reporting, moderation and administration |

## Technology direction

The current repository uses:
- Next.js App Router
- React and TypeScript
- Tailwind CSS 4
- Supabase JS client (backend integration still needs configuration and security review)

The intended production architecture uses Supabase for authentication, relational data and media storage, with server-side authorization, row-level security and carefully scoped storage policies. The web application is designed to be responsive across mobile and desktop.

## Current development status

The social experience is being built in stages. The current branch introduces a responsive social-platform home, local demo interactions, browser camera capture, a Supabase email sign-up/sign-in screen, and an initial database migration. The feed is still demo content; posts, reactions and follows are not yet persisted. Stories, messaging, community membership, discovery and cloud media uploads still require implementation.

Before public launch, the project still needs:
1. Supabase project configuration and environment variables.
2. Database migrations, indexes, row-level security and storage policies.
3. Authentication, profile creation and account recovery.
4. Persistent posts, media upload, feeds and interactions.
5. Messaging, notifications, stories and video delivery.
6. Reporting, moderation, privacy controls and admin authorization.
7. Automated tests, accessibility checks, performance work and deployment verification.

## Local development

Requirements: Node.js compatible with the installed Next.js version and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Copy `.env.example` to `.env.local` and add your Supabase project URL and public anon/publishable key. Apply the reviewed SQL migration in `supabase/migrations/` to your Supabase project before enabling real accounts. Never commit secret service-role keys. Only a public anon/publishable key may be exposed to browser code, and it must be protected by database and storage policies.

## Project ownership

**GC Smart Technology**  
SmartTag Worldwide — *One connected world. Every way to share.*
