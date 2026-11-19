"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CameraForge from "@/components/CameraForge";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CommentItem = { id: string | number; author: string; body: string; time: string };
type Post = { id: string | number; authorId?: string; name: string; handle: string; time: string; initials: string; color: string; text: string; tags: string[]; image?: string; video?: string; likes: number; comments: number; kind: "photo" | "video" | "text" };

const starterPosts: Post[] = [
  { id: 1, name: "Amara Okafor", handle: "@amara.creates", time: "12 min ago", initials: "AO", color: "coral", text: "A little reminder to keep creating, keep learning and keep showing up. Your next chapter can start with one small step. ✨", tags: ["CreatorLife", "MondayMotivation"], image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85", likes: 248, comments: 32, kind: "photo" },
  { id: 2, name: "Daniel Eze", handle: "@daniel.eze", time: "38 min ago", initials: "DE", color: "blue", text: "Exploring the city, meeting new people and finding inspiration in unexpected places. What are you discovering this week?", tags: ["Community", "Explore"], likes: 86, comments: 14, kind: "text" },
  { id: 3, name: "SmartTag Creators", handle: "@smarttag.creators", time: "1 hr ago", initials: "SC", color: "violet", text: "Welcome to the creator corner. Share what you are building, ask questions and connect with people who love making things.", tags: ["SmartTagCommunity", "Creators"], image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85", likes: 512, comments: 76, kind: "photo" },
];

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + " min ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + " hr ago";
  return Math.floor(seconds / 86400) + " days ago";
}

const stories = [{ name: "Your story", initials: "+", color: "add" }, { name: "Amara", initials: "AO", color: "coral" }, { name: "Daniel", initials: "DE", color: "blue" }, { name: "Mariam", initials: "MK", color: "gold" }, { name: "Tobi", initials: "TA", color: "violet" }, { name: "Creators", initials: "SC", color: "green" }];
const navItems = [{ label: "Home", icon: "⌂" }, { label: "Explore", icon: "⌕" }, { label: "Reels", icon: "▷" }, { label: "Messages", icon: "✉" }, { label: "Communities", icon: "♧" }, { label: "Saved", icon: "▱" }];

export default function SmartTagHome() {
  const [active, setActive] = useState("Home");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("For you");
  const [posts, setPosts] = useState(starterPosts);
  const [liked, setLiked] = useState<Array<string | number>>([]);
  const [publishing, setPublishing] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({});
  const [following, setFollowing] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [notice, setNotice] = useState("");
  const visiblePosts = useMemo(() => filter === "Videos" ? posts.filter(p => p.kind === "video") : filter === "Photos" ? posts.filter(p => p.kind === "photo") : filter === "Following" ? posts.filter(p => p.authorId && followingIds.includes(p.authorId)) : posts, [filter, posts, followingIds]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    async function loadSocialFeed() {
      const { data: authData } = await supabase!.auth.getUser();
      if (!authData.user) return;
      const { data: rows, error } = await supabase!.from("posts").select("id, body, created_at, author_id").eq("visibility", "public").is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
      if (error || !rows?.length || !active) return;
      const authorIds = [...new Set(rows.map(row => row.author_id))];
      const postIds = rows.map(row => row.id);
      const [{ data: profiles }, { data: reactions }, { data: mine }, { data: commentRows }, { data: mediaRows }, { data: followRows }] = await Promise.all([
        supabase!.from("profiles").select("id, username, display_name").in("id", authorIds),
        supabase!.from("post_reactions").select("post_id").in("post_id", postIds),
        supabase!.from("post_reactions").select("post_id").eq("user_id", authData.user.id).in("post_id", postIds),
        supabase!.from("comments").select("post_id").in("post_id", postIds),
        supabase!.from("post_media").select("post_id, storage_path, kind").in("post_id", postIds),
        supabase!.from("follows").select("following_id").eq("follower_id", authData.user.id).eq("status", "accepted"),
      ]);
      if (!active) return;
      const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
      const counts = new Map<string, number>();
      const mineIds = new Set((mine ?? []).map(reaction => reaction.post_id));
      const mediaMap = new Map<string, { url: string; kind: "image" | "video" }>();
      await Promise.all((mediaRows ?? []).map(async media => {
        const { data: signed } = await supabase!.storage.from("user-media").createSignedUrl(media.storage_path, 3600);
        if (signed?.signedUrl) mediaMap.set(media.post_id, { url: signed.signedUrl, kind: media.kind === "video" ? "video" : "image" });
      }));
      const commentCounts = new Map<string, number>();
      (commentRows ?? []).forEach(comment => commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1));
      (reactions ?? []).forEach(reaction => counts.set(reaction.post_id, (counts.get(reaction.post_id) ?? 0) + 1));
      setPosts(rows.map(row => {
        const profile = profileMap.get(row.author_id);
        const displayName = profile?.display_name ?? "SmartTag member";
        const media = mediaMap.get(row.id);
        return { id: row.id, authorId: row.author_id, name: displayName, handle: "@" + (profile?.username ?? "member"), time: timeAgo(row.created_at), initials: displayName.split(/\\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), color: "blue", text: row.body, tags: [], image: media?.kind === "image" ? media.url : undefined, video: media?.kind === "video" ? media.url : undefined, likes: Math.max(0, (counts.get(row.id) ?? 0) - (mineIds.has(row.id) ? 1 : 0)), comments: commentCounts.get(row.id) ?? 0, kind: media?.kind === "video" ? "video" as const : media?.kind === "image" ? "photo" as const : "text" as const };
      }));
      setLiked((mine ?? []).map(reaction => reaction.post_id));\n      setFollowingIds((followRows ?? []).map(row => row.following_id));
    }
    void loadSocialFeed();
    return () => { active = false; };
  }, []);

  async function publish() {
    const body = draft.trim();
    if ((!body && !selectedFile) || publishing) return;
    if (selectedFile && (selectedFile.size > 524288000 || !["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"].includes(selectedFile.type))) {
      setNotice("Choose a JPG, PNG, WEBP, GIF, MP4 or WEBM file up to 500 MB.");
      return;
    }
    setPublishing(true);
    try {
      let newPost: Post = { id: Date.now(), name: "You", handle: "@yourprofile", time: "Just now", initials: "YO", color: "blue", text: body, tags: ["NewPost"], likes: 0, comments: 0, kind: "text" };
      let message = "Your post has been added to this demo feed.";
      if (selectedFile && (!isSupabaseConfigured || !supabase)) {
        setNotice("Sign in and connect Supabase before publishing photos or videos.");
        return;
      }
      if (isSupabaseConfigured && supabase) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          let uploadedPath: string | null = null;
          try {
            if (selectedFile) {
              const extension = selectedFile.name.split(".").pop()?.toLowerCase() || (selectedFile.type.startsWith("video/") ? "webm" : "jpg");
              uploadedPath = authData.user.id + "/" + crypto.randomUUID() + "." + extension;
              const { error: uploadError } = await supabase.storage.from("user-media").upload(uploadedPath, selectedFile, { contentType: selectedFile.type, upsert: false });
              if (uploadError) throw uploadError;
            }
            const { data, error } = await supabase.from("posts").insert({ author_id: authData.user.id, body, visibility: "public" }).select("id, body, created_at, author_id").single();
            if (error) throw error;
            let mediaUrl: string | undefined;
            if (selectedFile && uploadedPath) {
              const mediaKind = selectedFile.type.startsWith("video/") ? "video" : "image";
              const { error: mediaError } = await supabase.from("post_media").insert({ post_id: data.id, owner_id: authData.user.id, storage_path: uploadedPath, kind: mediaKind, mime_type: selectedFile.type, byte_size: selectedFile.size, alt_text: selectedFile.name });
              if (mediaError) {
                await supabase.from("posts").delete().eq("id", data.id);
                throw mediaError;
              }
              const { data: signed } = await supabase.storage.from("user-media").createSignedUrl(uploadedPath, 3600);
              mediaUrl = signed?.signedUrl;
            }
            const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", authData.user.id).single();
            const displayName = profile?.display_name ?? "You";
            const isVideo = selectedFile?.type.startsWith("video/") ?? false;
            newPost = { id: data.id, authorId: data.author_id, name: displayName, handle: "@" + (profile?.username ?? "member"), time: "Just now", initials: displayName.split(/\\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), color: "blue", text: data.body, tags: [], image: selectedFile && !isVideo ? mediaUrl : undefined, video: selectedFile && isVideo ? mediaUrl : undefined, likes: 0, comments: 0, kind: isVideo ? "video" : selectedFile ? "photo" : "text" };
            message = "Your post has been published to SmartTag.";
          } catch (error) {
            if (uploadedPath) await supabase.storage.from("user-media").remove([uploadedPath]);
            throw error;
          }
        } else if (selectedFile) {
          setNotice("Sign in to publish photos and videos to SmartTag.");
          return;
        }
      }
      setPosts(current => [newPost, ...current]);
      setDraft(""); setSelectedFile(null); setShowComposer(false); setNotice(message);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Your post could not be published. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function openComments(postId: string | number) {
    if (commentingPostId === postId) { setCommentingPostId(null); return; }
    setCommentingPostId(postId);
    if (typeof postId !== "string" || !isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from("comments").select("id, body, created_at, author_id").eq("post_id", postId).is("deleted_at", null).order("created_at", { ascending: true }).limit(50);
    if (error) { setNotice(error.message); return; }
    const authorIds = [...new Set((data ?? []).map(row => row.author_id))];
    const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("id, display_name").in("id", authorIds) : { data: [] };
    const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile.display_name]));
    setCommentsByPost(current => ({ ...current, [String(postId)]: (data ?? []).map(row => ({ id: row.id, author: profileMap.get(row.author_id) ?? "SmartTag member", body: row.body, time: timeAgo(row.created_at) })) }));
  }

  async function addComment(postId: string | number) {
    const body = commentDraft.trim();
    if (!body) return;
    let item: CommentItem = { id: Date.now(), author: "You", body, time: "Just now" };
    if (typeof postId === "string" && isSupabaseConfigured && supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setNotice("Sign in to comment on SmartTag posts."); return; }
      const { data, error } = await supabase.from("comments").insert({ post_id: postId, author_id: authData.user.id, body }).select("id, body, created_at").single();
      if (error) { setNotice(error.message); return; }
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", authData.user.id).single();
      item = { id: data.id, author: profile?.display_name ?? "You", body: data.body, time: "Just now" };
    }
    setCommentsByPost(current => ({ ...current, [String(postId)]: [...(current[String(postId)] ?? []), item] }));
    setPosts(current => current.map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post));
    setCommentDraft("");
  }

  async function toggleLike(postId: string | number) {
    const alreadyLiked = liked.includes(postId);
    const post = posts.find(item => item.id === postId);
    if (typeof postId === "string" && post?.authorId && isSupabaseConfigured && supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const result = alreadyLiked
          ? await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", authData.user.id)
          : await supabase.from("post_reactions").insert({ post_id: postId, user_id: authData.user.id, reaction: "like" });
        if (result.error) { setNotice(result.error.message); return; }
      }
    }
    setLiked(current => alreadyLiked ? current.filter(id => id !== postId) : [...current, postId]);
  }

  return (
    <main className="st-app">
      <header className="st-topbar">
        <a className="st-brand" href="#" onClick={() => setActive("Home")}><span className="brand-mark">S</span><span>smart<span>tag</span></span></a>
        <label className="st-search"><span>⌕</span><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && searchTerm.trim()) window.location.assign("/people?q=" + encodeURIComponent(searchTerm.trim())); }} placeholder="Search people..." aria-label="Search SmartTag members" /><kbd>↵</kbd></label>
        <div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setNotice("Notifications will appear here when your account is connected.")}>♧<i /></button><Link href="/messages" className="icon-button grid place-items-center no-underline" aria-label="Open messages">✉</Link><Link href="/vault" className="icon-button grid place-items-center no-underline" aria-label="Open Smart Vault">▧</Link><Link className="mini-avatar blue grid place-items-center no-underline" href="/profile" aria-label="Open your profile settings">YO</Link></div>
      </header>
      <div className="st-layout">
        <aside className="left-sidebar">
          <div className="profile-mini"><div className="avatar blue">YO</div><div><strong>Your profile</strong><span>@yourprofile</span></div><span className="online-dot" /></div>
          <p className="side-label">YOUR SPACE</p>
          <nav className="main-nav">{navItems.map(item => item.label === "Explore" ? <Link key={item.label} href="/people" className="nav-item"><span className="nav-icon">{item.icon}</span>{item.label}</Link> : item.label === "Messages" ? <Link key={item.label} href="/messages" className="nav-item"><span className="nav-icon">{item.icon}</span>{item.label}</Link> : item.label === "Saved" ? <Link key={item.label} href="/vault" className="nav-item"><span className="nav-icon">{item.icon}</span>{item.label}</Link> : <button key={item.label} className={active === item.label ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === "Messages" && <b className="nav-count">3</b>}</button>)}</nav>
          <button className="create-button" onClick={() => setShowComposer(true)}><span>＋</span> Create a post</button><Link className="vault-nav-link" href="/vault">▧ <span>My Smart Vault</span> →</Link>
          <div className="sidebar-bottom"><p className="side-label">YOUR COMMUNITIES</p><button className="community-link"><span className="community-dot amber">✦</span> Creators Circle <small>2.4k</small></button><button className="community-link"><span className="community-dot mint">⌘</span> Tech & Innovation <small>1.8k</small></button><button className="community-link"><span className="community-dot lilac">♫</span> Music Lounge <small>960</small></button><Link className="see-all" href="/people">Discover members →</Link><button className="see-all" onClick={() => setActive("Communities")}>Explore communities →</button></div>
          <div className="sidebar-footer">About · Privacy · Guidelines<br/>© 2026 SmartTag Worldwide</div>
        </aside>
        <section className="feed-column">
          <div className="welcome-row"><div><p className="eyebrow">THURSDAY, NOVEMBER 19</p><h1>Your world, <span>your people.</span></h1><p className="welcome-sub">Catch up with your community.</p></div><div className="welcome-actions"><button className="studio-shortcut" onClick={() => setShowStudio(v => !v)}>◎ <span>Studio</span></button><button className="round-plus" onClick={() => setShowComposer(true)}>＋</button></div></div>
          {showStudio && <div className="studio-panel"><CameraForge /></div>}
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          <section className="stories-panel"><div className="section-heading"><div><h2>Stories</h2><p>Little moments from your people</p></div><button onClick={() => setNotice("Stories will be available when media publishing is connected.")}>See all <span>→</span></button></div><div className="stories-row">{stories.map((story, i) => <button className="story" key={story.name} onClick={() => setNotice(i === 0 ? "Story creation will be enabled with camera and media uploads." : story.name + "'s story preview is part of this interface demo.")}><span className={story.color === "add" ? "story-ring own-story" : "story-ring"}><span className={"avatar " + story.color}>{story.initials}</span></span><span>{story.name}</span></button>)}</div></section>
          <section className="composer-card"><div className="avatar blue">YO</div><button className="composer-prompt" onClick={() => setShowComposer(true)}>Share something with your community...</button><button className="composer-tool photo-tool" onClick={() => setNotice("Photo uploads will be connected to Smart Vault.")}>▧ <span>Photo</span></button><button className="composer-tool video-tool" onClick={() => setNotice("Video uploads and short videos are on the product roadmap.")}>▷ <span>Video</span></button></section>
          <div className="feed-heading"><div><h2>Your feed</h2><p>Ideas, moments and conversations</p></div><div className="feed-filters">{["For you", "Following", "Photos", "Videos"].map(f => <button key={f} className={filter === f ? "filter active-filter" : "filter"} onClick={() => setFilter(f)}>{f}</button>)}</div></div>
          {visiblePosts.length === 0 && <div className="empty-state">No {filter.toLowerCase()} in this demo feed yet.</div>}
          {visiblePosts.map(post => <article className="post-card" key={post.id}><div className="post-header"><div className={"avatar " + post.color}>{post.initials}</div><div className="post-author"><strong>{post.name} <span className="verified">✓</span></strong><span>{post.handle} · {post.time}</span></div><button className="more-button" aria-label="More post options" onClick={() => setNotice("More post options will be available on published posts.")}>•••</button></div><p className="post-copy">{post.text}</p><div className="tag-row">{post.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>{post.image && <div className="post-image-wrap"><Image src={post.image} alt="Community post visual" width={1200} height={800} unoptimized className="post-image" /></div>}{post.video && <div className="post-image-wrap"><video src={post.video} controls playsInline className="post-image" /></div>}<div className="post-stats"><span>{post.likes + (liked.includes(post.id) ? 1 : 0)} appreciations</span><span>{post.comments} comments · Share</span></div><div className="post-actions"><button className={liked.includes(post.id) ? "post-action is-liked" : "post-action"} onClick={() => void toggleLike(post.id)}><span>♡</span> Appreciate</button><button className="post-action" onClick={() => void openComments(post.id)}><span>▢</span> Comment</button><button className="post-action" onClick={() => setNotice("Sharing will be enabled for published posts.")}><span>↗</span> Share</button><button className="post-action save-action" onClick={() => setNotice("Saved items will be available in your personal library.")}><span>▱</span></button></div>{commentingPostId === post.id && <div className="comment-thread"><div className="comment-list">{(commentsByPost[String(post.id)] ?? []).map(comment => <div className="comment-item" key={comment.id}><strong>{comment.author}</strong><p>{comment.body}</p><small>{comment.time}</small></div>)}{(commentsByPost[String(post.id)] ?? []).length === 0 && <p className="no-comments">Start the conversation with a thoughtful comment.</p>}</div><form className="comment-form" onSubmit={event => { event.preventDefault(); void addComment(post.id); }}><input value={commentDraft} onChange={event => setCommentDraft(event.target.value)} placeholder="Write a comment..." maxLength={2000} aria-label="Write a comment" /><button type="submit" disabled={!commentDraft.trim()}>Send</button></form></div>}</article>)}
          <div className="feed-end"><span>✦</span><p>You&apos;re all caught up for now.</p><small>More from your world is on the way.</small></div>
        </section>
        <aside className="right-sidebar">
          <section className="welcome-card"><div className="welcome-card-glow" /><span className="welcome-kicker">WELCOME TO YOUR WORLD</span><h2>One place.<br/><em>Every connection.</em></h2><p>Share your moments, find your people and build something together.</p><button onClick={() => setNotice("Your SmartTag profile setup will begin after account registration is connected.")}>Complete your profile <span>→</span></button></section>
          <section className="side-widget"><div className="widget-title"><h3>People you may know</h3><button onClick={() => setActive("Explore")}>See all</button></div>{[{n:"Mariam Kalu",h:"@mariam.k",i:"MK",c:"gold",mutual:"12 mutual connections"},{n:"Tobi Adeyemi",h:"@tobi.a",i:"TA",c:"violet",mutual:"8 mutual connections"},{n:"Ifeoma Nwosu",h:"@ifeoma.n",i:"IN",c:"mint",mutual:"5 mutual connections"}].map(p => <div className="suggestion" key={p.h}><div className={"avatar " + p.c}>{p.i}</div><div className="suggestion-info"><strong>{p.n}</strong><span>{p.mutual}</span></div><button className={following.includes(p.h) ? "follow-button following" : "follow-button"} onClick={() => setFollowing(old => old.includes(p.h) ? old.filter(x => x !== p.h) : [...old, p.h])}>{following.includes(p.h) ? "✓" : "+"}</button></div>)}</section>
          <section className="side-widget trends-widget"><div className="widget-title"><h3>Trending in SmartTag</h3><span className="live-pill">LIVE</span></div>{[["01","#CreativeMinds","2.8k posts"],["02","#TechNaija","1.9k posts"],["03","#EverydayStories","1.2k posts"],["04","#BuildTogether","846 posts"]].map(t => <button className="trend-row" key={t[1]} onClick={() => setNotice(t[1] + " topic discovery will be available when search is connected.")}><span>{t[0]}</span><div><strong>{t[1]}</strong><small>{t[2]}</small></div><b>↗</b></button>)}</section>
          <div className="right-footer">Made for people, powered by community.<br/><strong>SMARTTAG</strong> · GC Smart Technology</div>
        </aside>
      </div>
      {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><section className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">CREATE SOMETHING</span><h2>Share with your world</h2></div><button onClick={() => setShowComposer(false)}>×</button></div><div className="modal-user"><div className="avatar blue">YO</div><div><strong>Your profile</strong><span>Sharing with your community</span></div></div><textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="What's happening in your world?" /><div className="modal-tools"><label className="cursor-pointer">▧ Add photo/video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) setSelectedFile(file); event.target.value = ""; }} /></label><span># Add tags</span></div>{selectedFile && <div className="mb-3 flex items-center justify-between rounded-lg bg-white/5 p-3 text-[10px] text-slate-300"><span className="truncate">{selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span><button onClick={() => setSelectedFile(null)} className="ml-3 text-rose-300">Remove</button></div>}<button className="publish-button" disabled={(!draft.trim() && !selectedFile) || publishing} onClick={() => void publish()}>{publishing ? "Publishing…" : "Publish post"} <span>→</span></button><p className="demo-note">Text-only demo posts stay in this page session. Signed-in photo and video posts are saved to SmartTag.</p></section></div>}
      <nav className="mobile-nav">{navItems.map(item => item.label === "Explore" ? <Link key={item.label} href="/people"><span>{item.icon}</span><small>{item.label}</small></Link> : item.label === "Messages" ? <Link key={item.label} href="/messages"><span>{item.icon}</span><small>{item.label}</small></Link> : item.label === "Saved" ? <Link key={item.label} href="/vault" className=""><span>{item.icon}</span><small>{item.label}</small></Link> : <button key={item.label} className={active === item.label ? "mobile-active" : ""} onClick={() => setActive(item.label)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </main>
  );
}
