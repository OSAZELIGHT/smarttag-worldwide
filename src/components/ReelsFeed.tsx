"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Reel = { id: string; body: string; url: string; author: string; username: string; created_at: string };

export default function ReelsFeed() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and publish video posts to start your Reels feed.");
      setLoading(false);
      return;
    }
    const { data: media, error } = await supabase.from("post_media")
      .select("post_id, storage_path")
      .eq("kind", "video")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const ids = [...new Set((media ?? []).map(item => item.post_id))];
    if (!ids.length) {
      setReels([]);
      setLoading(false);
      return;
    }
    const [{ data: posts }, { data: assets }] = await Promise.all([
      supabase.from("posts").select("id, body, author_id, created_at").in("id", ids).is("deleted_at", null),
      Promise.resolve({ data: media }),
    ]);
    const authorIds = [...new Set((posts ?? []).map(post => post.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, display_name, username").in("id", authorIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
    const mediaMap = new Map((assets ?? []).map(asset => [asset.post_id, asset.storage_path]));
    const rows = await Promise.all((posts ?? []).map(async post => {
      const path = mediaMap.get(post.id);
      if (!path) return null;
      const { data: signed } = await supabase.storage.from("user-media").createSignedUrl(path, 3600);
      if (!signed?.signedUrl) return null;
      const profile = profileMap.get(post.author_id);
      return {
        id: post.id,
        body: post.body,
        url: signed.signedUrl,
        author: profile?.display_name ?? "SmartTag member",
        username: profile?.username ?? "member",
        created_at: post.created_at,
      };
    }));
    setReels(rows.filter((item): item is Reel => item !== null));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex items-center justify-between"><div><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">SHORT VIDEO DISCOVERY</p><h1 className="mt-2 text-3xl font-black tracking-tight">Reels</h1><p className="mt-2 text-sm text-slate-400">Watch videos shared by your SmartTag community.</p></div><Link href="/" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold">Create a video post</Link></header>
        {message && <p role="status" className="mb-5 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}</p>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading videos…</p> : reels.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center"><span className="text-4xl text-slate-700">▷</span><h2 className="mt-4 text-sm font-bold">No videos yet</h2><p className="mt-2 text-xs text-slate-500">Video posts from your community will appear here.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{reels.map(reel => <article key={reel.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121927]"><video src={reel.url} controls playsInline preload="metadata" className="aspect-[9/14] w-full bg-black object-contain" /><div className="p-4"><p className="text-xs leading-5 text-slate-200">{reel.body}</p><p className="mt-3 text-[10px] font-bold text-blue-200">{reel.author} <span className="font-normal text-slate-500">@{reel.username}</span></p></div></article>)}</div>}
      </div>
    </main>
  );
}
