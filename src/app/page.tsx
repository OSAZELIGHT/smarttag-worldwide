"use client";

import { useMemo, useState } from "react";
import CameraForge from "@/components/CameraForge";

type Post = { id: number; name: string; handle: string; time: string; initials: string; color: string; text: string; tags: string[]; image?: string; likes: number; comments: number; kind: "photo" | "video" | "text" };

const starterPosts: Post[] = [
  { id: 1, name: "Amara Okafor", handle: "@amara.creates", time: "12 min ago", initials: "AO", color: "coral", text: "A little reminder to keep creating, keep learning and keep showing up. Your next chapter can start with one small step. ✨", tags: ["CreatorLife", "MondayMotivation"], image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85", likes: 248, comments: 32, kind: "photo" },
  { id: 2, name: "Daniel Eze", handle: "@daniel.eze", time: "38 min ago", initials: "DE", color: "blue", text: "Exploring the city, meeting new people and finding inspiration in unexpected places. What are you discovering this week?", tags: ["Community", "Explore"], likes: 86, comments: 14, kind: "text" },
  { id: 3, name: "SmartTag Creators", handle: "@smarttag.creators", time: "1 hr ago", initials: "SC", color: "violet", text: "Welcome to the creator corner. Share what you are building, ask questions and connect with people who love making things.", tags: ["SmartTagCommunity", "Creators"], image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85", likes: 512, comments: 76, kind: "photo" },
];

const stories = [{ name: "Your story", initials: "+", color: "add" }, { name: "Amara", initials: "AO", color: "coral" }, { name: "Daniel", initials: "DE", color: "blue" }, { name: "Mariam", initials: "MK", color: "gold" }, { name: "Tobi", initials: "TA", color: "violet" }, { name: "Creators", initials: "SC", color: "green" }];
const navItems = [{ label: "Home", icon: "⌂" }, { label: "Explore", icon: "⌕" }, { label: "Reels", icon: "▷" }, { label: "Messages", icon: "✉" }, { label: "Communities", icon: "♧" }, { label: "Saved", icon: "▱" }];

export default function SmartTagHome() {
  const [active, setActive] = useState("Home");
  const [filter, setFilter] = useState("For you");
  const [posts, setPosts] = useState(starterPosts);
  const [liked, setLiked] = useState<number[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [notice, setNotice] = useState("");
  const visiblePosts = useMemo(() => filter === "Videos" ? posts.filter(p => p.kind === "video") : filter === "Photos" ? posts.filter(p => p.kind === "photo") : posts, [filter, posts]);

  function publish() {
    if (!draft.trim()) return;
    setPosts([{ id: Date.now(), name: "You", handle: "@yourprofile", time: "Just now", initials: "YO", color: "blue", text: draft.trim(), tags: ["NewPost"], likes: 0, comments: 0, kind: "text" }, ...posts]);
    setDraft(""); setShowComposer(false); setNotice("Your post has been added to this demo feed.");
  }

  return (
    <main className="st-app">
      <header className="st-topbar">
        <a className="st-brand" href="#" onClick={() => setActive("Home")}><span className="brand-mark">S</span><span>smart<span>tag</span></span></a>
        <label className="st-search"><span>⌕</span><input placeholder="Search people, posts, topics..." aria-label="Search SmartTag" /><kbd>⌘ K</kbd></label>
        <div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setNotice("Notifications will appear here when your account is connected.")}>♧<i /></button><button className="icon-button" aria-label="Messages" onClick={() => setActive("Messages")}>✉</button><button className="mini-avatar blue">YO</button></div>
      </header>
      <div className="st-layout">
        <aside className="left-sidebar">
          <div className="profile-mini"><div className="avatar blue">YO</div><div><strong>Your profile</strong><span>@yourprofile</span></div><span className="online-dot" /></div>
          <p className="side-label">YOUR SPACE</p>
          <nav className="main-nav">{navItems.map(item => <button key={item.label} className={active === item.label ? "nav-item selected" : "nav-item"} onClick={() => setActive(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === "Messages" && <b className="nav-count">3</b>}</button>)}</nav>
          <button className="create-button" onClick={() => setShowComposer(true)}><span>＋</span> Create a post</button>
          <div className="sidebar-bottom"><p className="side-label">YOUR COMMUNITIES</p><button className="community-link"><span className="community-dot amber">✦</span> Creators Circle <small>2.4k</small></button><button className="community-link"><span className="community-dot mint">⌘</span> Tech & Innovation <small>1.8k</small></button><button className="community-link"><span className="community-dot lilac">♫</span> Music Lounge <small>960</small></button><button className="see-all" onClick={() => setActive("Communities")}>Explore communities →</button></div>
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
          {visiblePosts.map(post => <article className="post-card" key={post.id}><div className="post-header"><div className={"avatar " + post.color}>{post.initials}</div><div className="post-author"><strong>{post.name} <span className="verified">✓</span></strong><span>{post.handle} · {post.time}</span></div><button className="more-button" aria-label="More post options" onClick={() => setNotice("More post options will be available on published posts.")}>•••</button></div><p className="post-copy">{post.text}</p><div className="tag-row">{post.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>{post.image && <div className="post-image-wrap"><img src={post.image} alt="Community post visual" className="post-image" /></div>}<div className="post-stats"><span>{post.likes + (liked.includes(post.id) ? 1 : 0)} appreciations</span><span>{post.comments} comments · Share</span></div><div className="post-actions"><button className={liked.includes(post.id) ? "post-action is-liked" : "post-action"} onClick={() => setLiked(old => old.includes(post.id) ? old.filter(id => id !== post.id) : [...old, post.id])}><span>♡</span> Appreciate</button><button className="post-action" onClick={() => setNotice("Comments will be enabled when the social backend is connected.")}><span>▢</span> Comment</button><button className="post-action" onClick={() => setNotice("Sharing will be enabled for published posts.")}><span>↗</span> Share</button><button className="post-action save-action" onClick={() => setNotice("Saved items will be available in your personal library.")}><span>▱</span></button></div></article>)}
          <div className="feed-end"><span>✦</span><p>You're all caught up for now.</p><small>More from your world is on the way.</small></div>
        </section>
        <aside className="right-sidebar">
          <section className="welcome-card"><div className="welcome-card-glow" /><span className="welcome-kicker">WELCOME TO YOUR WORLD</span><h2>One place.<br/><em>Every connection.</em></h2><p>Share your moments, find your people and build something together.</p><button onClick={() => setNotice("Your SmartTag profile setup will begin after account registration is connected.")}>Complete your profile <span>→</span></button></section>
          <section className="side-widget"><div className="widget-title"><h3>People you may know</h3><button onClick={() => setActive("Explore")}>See all</button></div>{[{n:"Mariam Kalu",h:"@mariam.k",i:"MK",c:"gold",mutual:"12 mutual connections"},{n:"Tobi Adeyemi",h:"@tobi.a",i:"TA",c:"violet",mutual:"8 mutual connections"},{n:"Ifeoma Nwosu",h:"@ifeoma.n",i:"IN",c:"mint",mutual:"5 mutual connections"}].map(p => <div className="suggestion" key={p.h}><div className={"avatar " + p.c}>{p.i}</div><div className="suggestion-info"><strong>{p.n}</strong><span>{p.mutual}</span></div><button className={following.includes(p.h) ? "follow-button following" : "follow-button"} onClick={() => setFollowing(old => old.includes(p.h) ? old.filter(x => x !== p.h) : [...old, p.h])}>{following.includes(p.h) ? "✓" : "+"}</button></div>)}</section>
          <section className="side-widget trends-widget"><div className="widget-title"><h3>Trending in SmartTag</h3><span className="live-pill">LIVE</span></div>{[["01","#CreativeMinds","2.8k posts"],["02","#TechNaija","1.9k posts"],["03","#EverydayStories","1.2k posts"],["04","#BuildTogether","846 posts"]].map(t => <button className="trend-row" key={t[1]} onClick={() => setNotice(t[1] + " topic discovery will be available when search is connected.")}><span>{t[0]}</span><div><strong>{t[1]}</strong><small>{t[2]}</small></div><b>↗</b></button>)}</section>
          <div className="right-footer">Made for people, powered by community.<br/><strong>SMARTTAG</strong> · GC Smart Technology</div>
        </aside>
      </div>
      {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><section className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">CREATE SOMETHING</span><h2>Share with your world</h2></div><button onClick={() => setShowComposer(false)}>×</button></div><div className="modal-user"><div className="avatar blue">YO</div><div><strong>Your profile</strong><span>Sharing with your community</span></div></div><textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="What's happening in your world?" /><div className="modal-tools"><span>＋ Add to your story</span><span>▧ Photo / video</span><span># Add tags</span></div><button className="publish-button" disabled={!draft.trim()} onClick={publish}>Publish post <span>→</span></button><p className="demo-note">Demo mode: posts are only stored in this page session.</p></section></div>}
      <nav className="mobile-nav">{navItems.slice(0,5).map(item => <button key={item.label} className={active === item.label ? "mobile-active" : ""} onClick={() => setActive(item.label)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </main>
  );
}
