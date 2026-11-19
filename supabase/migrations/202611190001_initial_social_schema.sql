-- SmartTag Worldwide: initial social platform schema
-- Apply only after reviewing the deployment environment and configuring Supabase.
-- All user-owned records are scoped to auth.uid(); never expose service-role keys.

create extension if not exists pgcrypto;

create type public.post_visibility as enum ('public', 'followers', 'private');
create type public.media_kind as enum ('image', 'video', 'audio', 'file');
create type public.reaction_kind as enum ('like', 'love', 'celebrate', 'support', 'funny');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text,
  cover_path text,
  website text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile automatically after Supabase Auth creates an account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  requested_username text;
  requested_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  requested_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'SmartTag member');
  if requested_username !~ '^[a-zA-Z0-9_.]{3,30}
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  visibility public.post_visibility not null default 'public',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(body) > 0 or id is not null)
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  kind public.media_kind not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 524288000),
  width integer,
  height integer,
  duration_seconds numeric(10,2),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_kind not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  media_kind public.media_kind not null,
  caption text not null default '' check (char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at)
);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  description text not null default '' check (char_length(description) <= 1000),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  media_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (char_length(body) > 0 or media_path is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('follow','reaction','comment','mention','message','community_invite')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag = lower(tag) and char_length(tag) between 1 and 60)
);

create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','hate','violence','nudity','misinformation','other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, reported_user_id) = 1)
);

create index posts_author_created_idx on public.posts(author_id, created_at desc) where deleted_at is null;
create index posts_feed_idx on public.posts(created_at desc) where visibility = 'public' and deleted_at is null;
create index comments_post_created_idx on public.comments(post_id, created_at) where deleted_at is null;
create index reactions_user_idx on public.post_reactions(user_id);
create index stories_expiry_idx on public.stories(expires_at);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc) where deleted_at is null;
create index notifications_inbox_idx on public.notifications(recipient_id, created_at desc);
create index community_members_user_idx on public.community_members(user_id);

create or replace function public.is_blocked_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = target_user_id)
       or (b.blocker_id = target_user_id and b.blocked_id = auth.uid())
  );
$;
revoke all on function public.is_blocked_with(uuid) from public;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- RLS is enabled on every user-facing table. Policies below are a conservative
-- first pass; expand visibility rules only with explicit product requirements.
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.user_blocks enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.content_reports enable row level security;

create policy "Profiles respect privacy and blocks" on public.profiles for select to authenticated using ((not is_private or id = auth.uid() or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = id)) and not public.is_blocked_with(id));
create policy "Members create their own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Members update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Follow relationships exclude blocked accounts" on public.follows for select to authenticated using (not public.is_blocked_with(follower_id) and not public.is_blocked_with(following_id));
create policy "Members follow from their own account" on public.follows for insert to authenticated with check (follower_id = auth.uid() and not public.is_blocked_with(following_id));
create policy "Members unfollow from their own account" on public.follows for delete to authenticated using (follower_id = auth.uid());
create policy "Members see blocks they created" on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "Members block from their own account" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "Members unblock from their own account" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

create policy "Public posts and own posts are readable" on public.posts for select to authenticated using (deleted_at is null and not public.is_blocked_with(author_id) and (visibility = 'public' or author_id = auth.uid() or (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id))));
create policy "Members create posts as themselves" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update their own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "Post media follows readable parent post" on public.post_media for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null and (p.visibility = 'public' or p.author_id = auth.uid() or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id)))));
create policy "Owners attach media" on public.post_media for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "Comments on readable posts are visible" on public.comments for select to authenticated using (deleted_at is null and exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null and (p.visibility = 'public' or p.author_id = auth.uid() or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id)))));
create policy "Members comment as themselves" on public.comments for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.comments_enabled and p.deleted_at is null));
create policy "Authors edit their comments" on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their comments" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "Reactions visible to signed-in members" on public.post_reactions for select to authenticated using (true);
create policy "Members react as themselves" on public.post_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "Members remove own reactions" on public.post_reactions for delete to authenticated using (user_id = auth.uid());

create policy "Active stories respect profile privacy" on public.stories for select to authenticated using (expires_at > now() and not public.is_blocked_with(author_id) and (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = author_id and not p.is_private) or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id)));
create policy "Members publish their own stories" on public.stories for insert to authenticated with check (author_id = auth.uid());
create policy "Members delete own stories" on public.stories for delete to authenticated using (author_id = auth.uid());
create policy "Viewers record their own story views" on public.story_views for insert to authenticated with check (viewer_id = auth.uid());
create policy "Story owners see views and viewers see own views" on public.story_views for select to authenticated using (viewer_id = auth.uid() or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));

create or replace function public.is_community_member(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $
  select exists (
    select 1 from public.community_members m
    where m.community_id = target_community_id and m.user_id = auth.uid()
  );
$;
revoke all on function public.is_community_member(uuid) from public;
grant execute on function public.is_community_member(uuid) to authenticated;

create policy "Public communities are discoverable" on public.communities for select to authenticated using (not is_private or owner_id = auth.uid() or public.is_community_member(id));
create policy "Members create communities" on public.communities for insert to authenticated with check (owner_id = auth.uid());
create policy "Community owners update communities" on public.communities for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Members see memberships in discoverable communities" on public.community_members for select to authenticated using (user_id = auth.uid() or public.is_community_member(community_id) or exists (select 1 from public.communities c where c.id = community_id and not c.is_private));
create policy "Members join as themselves" on public.community_members for insert to authenticated with check (user_id = auth.uid());
create policy "Members leave themselves" on public.community_members for delete to authenticated using (user_id = auth.uid());

create policy "Members see their conversations" on public.conversations for select to authenticated using (exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid()));
create policy "Members create conversations" on public.conversations for insert to authenticated with check (created_by = auth.uid());
create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = target_conversation_id and m.user_id = auth.uid()
  );
$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create policy "Members see conversation participants" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Conversation creator adds members" on public.conversation_members for insert to authenticated with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()));
create policy "Members see messages in their conversations" on public.messages for select to authenticated using (deleted_at is null and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));
create policy "Members send messages as themselves" on public.messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));
create policy "Senders edit their own messages" on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy "Recipients read their notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "Recipients update their notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Signed-in members can read hashtags" on public.hashtags for select to authenticated using (true);
create policy "Post hashtags follow post visibility" on public.post_hashtags for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null and (p.visibility = 'public' or p.author_id = auth.uid() or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id)))));
create policy "Post authors attach hashtags" on public.post_hashtags for insert to authenticated with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "Members submit reports as themselves" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Reporters see their own reports" on public.content_reports for select to authenticated using (reporter_id = auth.uid());

-- Storage setup is intentionally not automated here. Create private buckets for
-- user-media and message-media, then add object policies that validate the first
-- path segment equals auth.uid(). Do not make private uploads publicly readable.
 then
    requested_username := 'u_' || replace(new.id::text, '-', '');
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, left(requested_name, 80));
  return new;
end;
$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  visibility public.post_visibility not null default 'public',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(body) > 0 or id is not null)
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  kind public.media_kind not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 524288000),
  width integer,
  height integer,
  duration_seconds numeric(10,2),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_kind not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  media_kind public.media_kind not null,
  caption text not null default '' check (char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at)
);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  description text not null default '' check (char_length(description) <= 1000),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  media_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (char_length(body) > 0 or media_path is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('follow','reaction','comment','mention','message','community_invite')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag = lower(tag) and char_length(tag) between 1 and 60)
);

create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','hate','violence','nudity','misinformation','other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, reported_user_id) = 1)
);

create index posts_author_created_idx on public.posts(author_id, created_at desc) where deleted_at is null;
create index posts_feed_idx on public.posts(created_at desc) where visibility = 'public' and deleted_at is null;
create index comments_post_created_idx on public.comments(post_id, created_at) where deleted_at is null;
create index reactions_user_idx on public.post_reactions(user_id);
create index stories_expiry_idx on public.stories(expires_at);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc) where deleted_at is null;
create index notifications_inbox_idx on public.notifications(recipient_id, created_at desc);
create index community_members_user_idx on public.community_members(user_id);

-- RLS is enabled on every user-facing table. Policies below are a conservative
-- first pass; expand visibility rules only with explicit product requirements.
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.content_reports enable row level security;

create policy "Profiles are visible to signed-in members" on public.profiles for select to authenticated using (true);
create policy "Members create their own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Members update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Follow relationships are visible to members" on public.follows for select to authenticated using (true);
create policy "Members follow from their own account" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "Members unfollow from their own account" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "Public posts and own posts are readable" on public.posts for select to authenticated using (deleted_at is null and (visibility = 'public' or author_id = auth.uid() or (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id))));
create policy "Members create posts as themselves" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update their own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "Post media follows readable parent post" on public.post_media for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null and (p.visibility = 'public' or p.author_id = auth.uid() or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id)))));
create policy "Owners attach media" on public.post_media for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "Comments on readable posts are visible" on public.comments for select to authenticated using (deleted_at is null and exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null and (p.visibility = 'public' or p.author_id = auth.uid() or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id)))));
create policy "Members comment as themselves" on public.comments for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.comments_enabled and p.deleted_at is null));
create policy "Authors edit their comments" on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their comments" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "Reactions visible to signed-in members" on public.post_reactions for select to authenticated using (true);
create policy "Members react as themselves" on public.post_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "Members remove own reactions" on public.post_reactions for delete to authenticated using (user_id = auth.uid());

create policy "Active stories are visible to signed-in members" on public.stories for select to authenticated using (expires_at > now());
create policy "Members publish their own stories" on public.stories for insert to authenticated with check (author_id = auth.uid());
create policy "Members delete own stories" on public.stories for delete to authenticated using (author_id = auth.uid());
create policy "Viewers record their own story views" on public.story_views for insert to authenticated with check (viewer_id = auth.uid());
create policy "Story owners see views and viewers see own views" on public.story_views for select to authenticated using (viewer_id = auth.uid() or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));

create or replace function public.is_community_member(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $
  select exists (
    select 1 from public.community_members m
    where m.community_id = target_community_id and m.user_id = auth.uid()
  );
$;
revoke all on function public.is_community_member(uuid) from public;
grant execute on function public.is_community_member(uuid) to authenticated;

create policy "Public communities are discoverable" on public.communities for select to authenticated using (not is_private or owner_id = auth.uid() or public.is_community_member(id));
create policy "Members create communities" on public.communities for insert to authenticated with check (owner_id = auth.uid());
create policy "Community owners update communities" on public.communities for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Members see memberships in discoverable communities" on public.community_members for select to authenticated using (user_id = auth.uid() or public.is_community_member(community_id) or exists (select 1 from public.communities c where c.id = community_id and not c.is_private));
create policy "Members join as themselves" on public.community_members for insert to authenticated with check (user_id = auth.uid());
create policy "Members leave themselves" on public.community_members for delete to authenticated using (user_id = auth.uid());

create policy "Members see their conversations" on public.conversations for select to authenticated using (exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid()));
create policy "Members create conversations" on public.conversations for insert to authenticated with check (created_by = auth.uid());
create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = target_conversation_id and m.user_id = auth.uid()
  );
$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create policy "Members see conversation participants" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Conversation creator adds members" on public.conversation_members for insert to authenticated with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()));
create policy "Members see messages in their conversations" on public.messages for select to authenticated using (deleted_at is null and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));
create policy "Members send messages as themselves" on public.messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));
create policy "Senders edit their own messages" on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy "Recipients read their notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "Recipients update their notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Signed-in members can read hashtags" on public.hashtags for select to authenticated using (true);
create policy "Signed-in members can read post hashtags" on public.post_hashtags for select to authenticated using (true);
create policy "Post authors attach hashtags" on public.post_hashtags for insert to authenticated with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "Members submit reports as themselves" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Reporters see their own reports" on public.content_reports for select to authenticated using (reporter_id = auth.uid());

-- Storage setup is intentionally not automated here. Create private buckets for
-- user-media and message-media, then add object policies that validate the first
-- path segment equals auth.uid(). Do not make private uploads publicly readable.
