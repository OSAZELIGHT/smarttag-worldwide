# SmartTag Worldwide — product and engineering blueprint

## Product definition

SmartTag is a broad social network and digital community, not a camera utility. Its goal is to bring the core social activities people currently spread across multiple platforms into one coherent product, while making capture, identification, tagging and personal media organization a distinctive SmartTag advantage.

## Experience areas

1. **Identity** — registration, secure sessions, profiles, privacy, followers and connections.
2. **Home** — ranked and chronological feeds, post composer, reactions, comments, repost/share and saved items.
3. **Stories** — short-lived photo/video updates, audience selection and view lists.
4. **Short video** — vertical discovery feed, creator profiles, captions, likes, comments and moderation.
5. **Explore** — people, hashtags, trending topics, posts and community discovery.
6. **Messaging** — one-to-one and group conversations, media, read state and notifications.
7. **Communities** — public/private groups, membership, roles, posts and moderation.
8. **SmartTag Studio** — camera capture, media metadata, manual tagging, identification workflows and Smart Vault.
9. **Trust and safety** — reporting, blocking, privacy settings, rate limits, moderation queue and appeals.
10. **Administration** — protected operational tools, audit trails, platform configuration and abuse response.

## Architecture

- **Web client:** Next.js App Router, React, TypeScript, responsive Tailwind CSS.
- **Identity and database:** Supabase Auth and PostgreSQL.
- **Media:** Supabase Storage private buckets, signed URLs and upload constraints.
- **Realtime:** Supabase Realtime for message and notification updates where appropriate.
- **Video delivery:** begin with controlled uploads and playback; introduce a dedicated transcoding/CDN pipeline before large-scale public video launch.
- **Server boundaries:** privileged actions run in server-side route handlers or server actions with validated input and authorization. Never expose service-role credentials to browser code.
- **Moderation:** report intake, review states, admin roles and audit events. Admin access must be enforced in server code and RLS, not only in the UI.

## Data model in the first migration

The initial SQL migration defines profiles, follows, posts, media, comments, reactions, stories and views, communities and memberships, conversations and messages, notifications, hashtags and reports. It enables RLS and provides conservative starting policies.

**Important:** this migration is a foundation, not a completed security certification. Review it against the actual Supabase project, test every policy using separate user accounts, add automated policy tests, and implement storage policies before accepting real uploads. Private-profile story visibility, blocking, moderation audit history, rate limits, feed ranking and notification fan-out require further migrations.

## Delivery plan

### Stage 1 — product shell and interaction prototype
- [x] Replace the starter landing page with the SmartTag social home.
- [x] Establish mobile/desktop navigation, feed, stories strip, post composer and suggested connections.
- [x] Add local demo interactions for publishing, appreciating and following.
- [x] Add a browser capture studio with photo/video recording and local downloads.
- [x] Document the product direction and first data model.
- [ ] Connect authentication and persistent profiles.

### Stage 2 — working social foundation
- Registration, login, email verification and password recovery.
- Profile editing and privacy.
- Persistent post creation, media upload, comments and reactions.
- Follow requests/relationships and feed queries.
- User blocking and reporting.

### Stage 3 — community and creator tools
- Stories with expiry and audience controls.
- Communities, roles and moderation.
- Short-video publishing and discovery.
- Creator pages, saved posts, hashtags and search.

### Stage 4 — communications
- Direct and group messaging.
- Realtime delivery, unread counts, read receipts and notifications.
- Safe media sharing and conversation controls.

### Stage 5 — SmartTag differentiation
- SmartTag metadata and manual tagging.
- Personal media vault and search.
- Optional AI-assisted media identification, always with user controls and correction.
- Cross-post organization and media privacy controls.

### Stage 6 — production readiness
- Server-side admin authorization and moderation console.
- Storage policies, abuse prevention, quotas and observability.
- Accessibility, security, load and device testing.
- Backup/restore, incident response and launch checklist.

## Current prototype limitations

The feed examples are demo data. Publishing, reactions and follow buttons currently update local page state only. The capture studio records in the browser and downloads files to the device; it does not upload to a cloud vault. Stories, messages, search, communities, trends and suggested people are visual placeholders. The navigation is a prototype shell, not yet a complete set of routed product areas.

## Required environment

Configure `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are public client configuration values, not secret credentials. Keep service-role keys exclusively in protected server environments. The app intentionally remains renderable without Supabase configured.

## Definition of done

A feature is not production-complete merely because its screen exists. It must have persistent data, server/database authorization, loading and error states, validation, accessibility, responsive behavior, automated tests, abuse controls where applicable, and verified deployment configuration.
