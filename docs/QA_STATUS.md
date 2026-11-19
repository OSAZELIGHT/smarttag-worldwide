# SmartTag branch QA status

**Review date:** 19 November 2026  
**Development branch:** `smarttag-social-platform-upgrade`  
**Target branch:** `main`

## Implemented in this branch

- Responsive social home, demo feed and navigation.
- Supabase email sign-up/sign-in and automatic profile creation trigger.
- Profile editing, private-profile controls, follow requests and approvals.
- Member discovery, follow/unfollow and account blocking/unblocking.
- Persistent text/photo/video posts, comments, reactions and saved posts.
- Private one-to-one text messaging.
- Camera capture, device media uploads, private Smart Vault and tagging.
- 24-hour stories, story viewer and video/Reels discovery.
- Community creation, public joining and private community shells.
- Post reporting and database report intake.
- Initial PostgreSQL schema, row-level security and private Storage bucket policies.
- CI workflow, Dependabot configuration, setup guide and release checklist.

## Verification blockers

1. **GitHub Actions:** recent workflow runs are ending with `startup_failure` before a job starts. There is no current passing lint/build result. An earlier run did complete dependency installation and identified a JSX closing-tag error in the account screen; that issue was corrected.
2. **Vercel:** the latest commit's Vercel check is blocked by a project build-rate limit. A preview deployment has not been verified.
3. **Supabase:** no active SmartTag backend has been selected and connected for this branch. The migration has not been applied to a live project, and real account/storage flows have not been integration-tested.
4. **Pull request:** GitHub rejected PR creation because the connected OSAZELIGHT account does not have a verified email address. The branch remains separate; nothing has been merged into `main`.
5. **Dependencies:** the earlier `npm ci` workflow output reported 19 dependency advisories, including one critical advisory. Dependabot is enabled; review and remediate the advisories without blindly applying breaking upgrades.

## Required before calling this production-ready

- Verify the GitHub account email, then open and review a PR into `main`.
- Restore GitHub Actions runner availability and obtain passing ESLint and production-build checks.
- Resolve the Vercel build-rate limit and verify a preview deployment.
- Select an active Supabase project, apply the migration to a fresh database, configure Auth URLs and environment variables, and test with multiple accounts.
- Test RLS, private storage, blocking, follow approvals, conversations, stories and report handling with distinct users.
- Complete realtime messaging, group conversations, community posts/moderation, notifications, account deletion, backups and abuse-prevention controls.

This branch is a substantial development prototype, not a production release. Do not invite real users or publish sensitive media until the verification items above are complete.
