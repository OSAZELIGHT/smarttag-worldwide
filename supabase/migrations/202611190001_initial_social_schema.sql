-- SmartTag Worldwide: clean initial schema for Supabase.
-- Review and apply this migration to a fresh Supabase project before launch.
create extension if not exists pgcrypto;

create type public.post_visibility as enum ('public','followers','private');
create type public.media_kind as enum ('image','video','audio','file');
create type public.reaction_kind as enum ('like','love','celebrate','support','funny');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_path text, cover_path text, website text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username',''));
  requested_name := left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email,''),'@',1), 'SmartTag member'),80);
  if requested_username !~ '^[a-zA-Z0-9_.]{3,30}$' then
    requested_username := 'user_' || substr(replace(new.id::text,'-',''),1,24);
  end if;
  begin
    insert into public.profiles(id,username,display_name) values (new.id,requested_username,requested_name);
  exception when unique_violation then
    requested_username := 'user_' || substr(replace(new.id::text,'-',''),1,24);
    insert into public.profiles(id,username,display_name) values (new.id,requested_username,requested_name);
  end;
  return new;
end;
$function$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id), check(follower_id <> following_id)
);
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id)
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check(char_length(body) <= 5000),
  visibility public.post_visibility not null default 'public',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
);
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique, kind public.media_kind not null,
  mime_type text not null, byte_size bigint not null check(byte_size between 1 and 524288000),
  width integer, height integer, duration_seconds numeric(10,2),
  alt_text text not null default '' check(char_length(alt_text) <= 300),
  created_at timestamptz not null default now()
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  kind public.media_kind not null,
  file_name text not null check(char_length(file_name) between 1 and 255),
  mime_type text not null,
  byte_size bigint not null check(byte_size between 1 and 524288000),
  title text not null default '' check(char_length(title) <= 120),
  description text not null default '' check(char_length(description) <= 1000),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_assets_owner_created_idx on public.media_assets(owner_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_kind not null default 'like',
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null, media_kind public.media_kind not null,
  caption text not null default '' check(char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check(expires_at > created_at)
);
create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(), primary key(story_id,viewer_id)
);
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 2 and 80),
  slug text not null unique check(slug ~ '^[a-z0-9-]{3,80}$'),
  description text not null default '' check(char_length(description) <= 1000),
  is_private boolean not null default false, created_at timestamptz not null default now()
);
create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check(role in ('owner','moderator','member')) ,
  joined_at timestamptz not null default now(), primary key(community_id,user_id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), last_read_at timestamptz, primary key(conversation_id,user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check(char_length(body) <= 10000), media_path text,
  created_at timestamptz not null default now(), edited_at timestamptz, deleted_at timestamptz,
  check(char_length(body) > 0 or media_path is not null)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check(kind in ('follow','reaction','comment','mention','message','community_invite')),
  entity_id uuid, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.hashtags (id uuid primary key default gen_random_uuid(), tag text not null unique check(tag = lower(tag) and char_length(tag) between 1 and 60));
create table public.post_hashtags (post_id uuid not null references public.posts(id) on delete cascade, hashtag_id uuid not null references public.hashtags(id) on delete cascade, primary key(post_id,hashtag_id));
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null check(reason in ('spam','harassment','hate','violence','nudity','misinformation','other')),
  details text not null default '' check(char_length(details) <= 2000),
  status text not null default 'open' check(status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  check(num_nonnulls(post_id,comment_id,reported_user_id) = 1)
);

create index posts_feed_idx on public.posts(created_at desc) where visibility='public' and deleted_at is null;
create index posts_author_idx on public.posts(author_id,created_at desc) where deleted_at is null;
create index comments_post_idx on public.comments(post_id,created_at) where deleted_at is null;
create index messages_conversation_idx on public.messages(conversation_id,created_at desc) where deleted_at is null;
create index notifications_inbox_idx on public.notifications(recipient_id,created_at desc);
create index stories_expiry_idx on public.stories(expires_at);

create or replace function public.is_blocked_with(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $function$
  select exists(
    select 1 from public.user_blocks b
    where (b.blocker_id=auth.uid() and b.blocked_id=target_user_id)
       or (b.blocker_id=target_user_id and b.blocked_id=auth.uid())
  );
$function$;
revoke all on function public.is_blocked_with(uuid) from public;
grant execute on function public.is_blocked_with(uuid) to authenticated;

create or replace function public.is_conversation_member(target_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $function$ select exists(select 1 from public.conversation_members m where m.conversation_id=target_id and m.user_id=auth.uid()); $function$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.user_blocks enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.media_assets enable row level security;
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

create policy profiles_read on public.profiles for select to authenticated using ((not is_private or id=auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=id)) and not public.is_blocked_with(id));
create policy profiles_insert on public.profiles for insert to authenticated with check (id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy follows_read on public.follows for select to authenticated using (not public.is_blocked_with(follower_id) and not public.is_blocked_with(following_id));
create policy follows_insert on public.follows for insert to authenticated with check (follower_id=auth.uid() and not public.is_blocked_with(following_id));
create policy follows_delete on public.follows for delete to authenticated using (follower_id=auth.uid());
create policy blocks_read on public.user_blocks for select to authenticated using (blocker_id=auth.uid());
create policy blocks_insert on public.user_blocks for insert to authenticated with check (blocker_id=auth.uid());
create policy blocks_delete on public.user_blocks for delete to authenticated using (blocker_id=auth.uid());
create policy posts_read on public.posts for select to authenticated using (deleted_at is null and not public.is_blocked_with(author_id) and (author_id=auth.uid() or (visibility in ('public','followers') and exists(select 1 from public.profiles pr where pr.id=author_id and (not pr.is_private or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=author_id)))) and (visibility='public' or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=author_id)));
create policy posts_insert on public.posts for insert to authenticated with check (author_id=auth.uid());
create policy posts_update on public.posts for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id=auth.uid());
create policy post_media_read on public.post_media for select to authenticated using (exists(select 1 from public.posts p where p.id=post_id and p.deleted_at is null and (p.visibility='public' or p.author_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id))));
create policy post_media_insert on public.post_media for insert to authenticated with check (owner_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));
create policy media_assets_read on public.media_assets for select to authenticated using (owner_id=auth.uid());
create policy media_assets_insert on public.media_assets for insert to authenticated with check (owner_id=auth.uid());
create policy media_assets_update on public.media_assets for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy media_assets_delete on public.media_assets for delete to authenticated using (owner_id=auth.uid());
create policy comments_read on public.comments for select to authenticated using (deleted_at is null and exists(select 1 from public.posts p where p.id=post_id and p.deleted_at is null and (p.visibility='public' or p.author_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id))));
create policy comments_insert on public.comments for insert to authenticated with check (author_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and p.comments_enabled and p.deleted_at is null));
create policy comments_update on public.comments for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id=auth.uid());
create policy reactions_read on public.post_reactions for select to authenticated using (true);
create policy reactions_insert on public.post_reactions for insert to authenticated with check (user_id=auth.uid());
create policy reactions_delete on public.post_reactions for delete to authenticated using (user_id=auth.uid());
create policy stories_read on public.stories for select to authenticated using (expires_at>now() and not public.is_blocked_with(author_id) and (author_id=auth.uid() or exists(select 1 from public.profiles p where p.id=author_id and not p.is_private) or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=author_id)));
create policy stories_insert on public.stories for insert to authenticated with check (author_id=auth.uid());
create policy stories_delete on public.stories for delete to authenticated using (author_id=auth.uid());
create policy story_views_read on public.story_views for select to authenticated using (viewer_id=auth.uid() or exists(select 1 from public.stories s where s.id=story_id and s.author_id=auth.uid()));
create policy story_views_insert on public.story_views for insert to authenticated with check (viewer_id=auth.uid());
create policy communities_read on public.communities for select to authenticated using (not is_private or owner_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid()));
create policy communities_insert on public.communities for insert to authenticated with check (owner_id=auth.uid());
create policy communities_update on public.communities for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy community_members_read on public.community_members for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.communities c where c.id=community_id and not c.is_private));
create policy community_members_insert on public.community_members for insert to authenticated with check (user_id=auth.uid());
create policy community_members_delete on public.community_members for delete to authenticated using (user_id=auth.uid());
create policy conversations_read on public.conversations for select to authenticated using (public.is_conversation_member(id));
create policy conversations_insert on public.conversations for insert to authenticated with check (created_by=auth.uid());
create policy conversation_members_read on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy conversation_members_insert on public.conversation_members for insert to authenticated with check (exists(select 1 from public.conversations c where c.id=conversation_id and c.created_by=auth.uid()));
create policy messages_read on public.messages for select to authenticated using (deleted_at is null and public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy messages_update on public.messages for update to authenticated using (sender_id=auth.uid() and public.is_conversation_member(conversation_id)) with check (sender_id=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using (recipient_id=auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());
create policy hashtags_read on public.hashtags for select to authenticated using (true);
create policy post_hashtags_read on public.post_hashtags for select to authenticated using (exists(select 1 from public.posts p where p.id=post_id and (p.visibility='public' or p.author_id=auth.uid())));
create policy post_hashtags_insert on public.post_hashtags for insert to authenticated with check (exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));
create policy reports_insert on public.content_reports for insert to authenticated with check (reporter_id=auth.uid());
create policy reports_read on public.content_reports for select to authenticated using (reporter_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('user-media','user-media',false,524288000,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
('story-media','story-media',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
('message-media','message-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy user_media_upload on storage.objects for insert to authenticated with check (bucket_id='user-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy user_media_read on storage.objects for select to authenticated using (bucket_id='user-media' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.post_media pm join public.posts p on p.id=pm.post_id where pm.storage_path=name and p.visibility='public' and p.deleted_at is null and not public.is_blocked_with(p.author_id))));
create policy user_media_update on storage.objects for update to authenticated using (bucket_id='user-media' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='user-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy user_media_delete on storage.objects for delete to authenticated using (bucket_id='user-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy story_media_upload on storage.objects for insert to authenticated with check (bucket_id='story-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy story_media_read on storage.objects for select to authenticated using (bucket_id='story-media' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.stories s where s.media_path=name and s.expires_at>now())));
create policy story_media_delete on storage.objects for delete to authenticated using (bucket_id='story-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy message_media_upload on storage.objects for insert to authenticated with check (bucket_id='message-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy message_media_read on storage.objects for select to authenticated using (bucket_id='message-media' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.messages m where m.media_path=name and public.is_conversation_member(m.conversation_id) and m.deleted_at is null)));
create policy message_media_delete on storage.objects for delete to authenticated using (bucket_id='message-media' and (storage.foldername(name))[1]=auth.uid()::text);

create policy media_assets_storage_read on storage.objects for select to authenticated using (bucket_id='user-media' and exists(select 1 from public.media_assets a where a.storage_path=name and a.owner_id=auth.uid()));
