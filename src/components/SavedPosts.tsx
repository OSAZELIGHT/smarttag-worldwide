"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SavedItem = { id: string; body: string; created_at: string; author: string; username: string; image?: string; video?: string };

export default function SavedPosts() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and sign in to use your saved posts.");
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to view your saved posts.");
      setLoading(false);
      return;
    }
    const { data: saved, error } = await supabase.from("saved_posts")
      .select("post_id, created_at")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const ids = (saved ?? []).map(row => row.post_id);
    if (!ids.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const [{ data: posts }, { data: media }] = await Promise.all([
      supabase.from("posts").select("id, body, created_at, author_id").in("id", ids).is("deleted_at", null),
      supabase.from("post_media").select("post_id, storage_path, kind").in("post_id", ids),
    ]);
    const authorIds = [...new Set((posts ?? []).map(post => post.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, display_name, username").in("id", authorIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
    const mediaMap = new Map<string, { url: string; kind: string }>();
    await Promise.all((media ?? []).map(async asset => {
      const { data } = await supabase.storage.from("user-media").createSignedUrl(asset.storage_path, 3600);
      if (data?.signedUrl) mediaMap.set(asset.post_id, { url: data.signedUrl, kind: asset.kind });
    }));
    const postMap = new Map((posts ?? []).map(post => [post.id, post]));
    setItems(ids.flatMap(id => {
      const post = postMap.get(id);
      if (!post) return [];
      const profile = profileMap.get(post.author_id);
      const asset = mediaMap.get(id);
      return [{
        id,
        body: post.body,
        created_at: post.created_at,
        author: profile?.display_name ?? "SmartTag member",
        username: profile?.username ?? "member",
        image: asset?.kind === "image" ? asset.url : undefined,
        video: asset?.kind === "video" ? asset.url : undefined,
      }];
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!supabase || removing) return;
    setRemoving(id);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Your session has expired. Sign in again.");
      setRemoving(null);
      return;
    }
    const { error } = await supabase.from("saved_posts").delete().eq("user_id", authData.user.id).eq("post_id", id);
    if (error) setMessage(error.message);
    else setItems(current => current.filter(item => item.id !== id));
    setRemoving(null);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-9 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-white/10 pb-6"><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">YOUR COLLECTION</p><h1 className="mt-2 text-3xl font-black tracking-tight">Saved posts</h1><p className="mt-2 text-sm text-slate-400">Keep useful ideas and moments close at hand.</p></header>
        {message && <p role="status" className="mt-5 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</p>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading saved posts…</p> : items.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-14 text-center"><span className="text-4xl text-slate-600">▱</span><h2 className="mt-4 text-sm font-bold">Nothing saved yet</h2><p className="mt-2 text-xs text-slate-500">Use the bookmark action on a post to keep it here.</p><Link href="/" className="mt-5 inline-block text-xs font-bold text-blue-300">Explore your feed →</Link></div> : <div className="mt-6 space-y-4">{items.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121927] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold">{item.author}</h2><p className="mt-1 text-[10px] text-slate-500">@{item.username} · {new Date(item.created_at).toLocaleString()}</p></div><button onClick={() => void remove(item.id)} disabled={removing === item.id} className="text-[10px] text-rose-300 disabled:opacity-50">{removing === item.id ? "Removing…" : "Remove saved"}</button></div><p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-slate-200">{item.body}</p>{item.image && <Image src={item.image} alt="Saved post media" width={1200} height={800} unoptimized className="mt-4 max-h-96 w-full rounded-xl object-cover" />}{item.video && <video src={item.video} controls playsInline className="mt-4 max-h-96 w-full rounded-xl" />}</article>)}</div>}
      </div>
    </main>
  );
}
