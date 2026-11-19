# SmartTag release checklist

## Connected services
- [ ] Supabase project created and migration reviewed/applied.
- [ ] Supabase Auth Site URL, redirect URLs and email settings configured.
- [ ] Public Supabase URL and anon/publishable key configured in Vercel.
- [ ] Vercel project linked to the intended GitHub repository and deployment branch.
- [ ] Domain, HTTPS and environment separation verified.

## Product checks
- [ ] Sign-up, email confirmation, sign-in, sign-out and password recovery.
- [ ] Profile edit, private profile and follower request approval.
- [ ] Feed loads the correct public and follower-visible posts.
- [ ] Post creation, comments, reactions and deletion.
- [ ] Camera capture and device file upload.
- [ ] Private Smart Vault upload, signed preview, tag search and delete.
- [ ] Stories, messaging, communities and notifications are implemented before being advertised as live.

## Security and safety
- [ ] RLS reviewed and tested with two or more distinct accounts.
- [ ] Storage policies tested against private, public and cross-account paths.
- [ ] Blocking, reporting and moderation workflows verified.
- [ ] Admin actions require server-side authorization.
- [ ] Rate limits, spam controls and upload quotas configured.
- [ ] Privacy policy, terms, community standards and age-appropriate safety controls published.
- [ ] Account export and deletion process tested.

## Engineering and operations
- [ ] ESLint and production build pass on the release commit.
- [ ] Responsive and accessibility checks completed.
- [ ] Error monitoring and operational alerts configured.
- [ ] Database backups and restore procedure tested.
- [ ] Load, upload and video playback limits validated.
- [ ] Rollback procedure documented and tested.
