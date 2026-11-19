"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type VaultAsset = {
  id: string;
  storage_path: string;
  kind: "image" | "video" | "audio" | "file";
  file_name: string;
  mime_type: string;
  byte_size: number;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  signedUrl?: string;
};

function readableSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function SmartVault() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setMessage("");
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and apply the Smart Vault database migration to enable your private library.");
      setLoading(false);
      return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setMessage("Sign in to open your private Smart Vault.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("media_assets")
      .select("id, storage_path, kind, file_name, mime_type, byte_size, title, description, tags, created_at")
      .eq("owner_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setMessage(error.message.includes("media_assets")
        ? "The Smart Vault database migration has not been applied yet."
        : error.message);
      setLoading(false);
      return;
    }
    const signed = await Promise.all((data ?? []).map(async asset => {
      const { data: urlData } = await supabase.storage.from("user-media").createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: urlData?.signedUrl };
    }));
    setAssets(signed as VaultAsset[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadVault(); }, [loadVault]);

  const tags = useMemo(() => ["All", ...new Set(assets.flatMap(asset => asset.tags ?? []))], [assets]);
  const filtered = useMemo(() => assets.filter(asset => {
    const text = [asset.title, asset.file_name, asset.description, ...(asset.tags ?? [])].join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (activeTag === "All" || asset.tags?.includes(activeTag));
  }), [assets, query, activeTag]);

  async function deleteAsset(asset: VaultAsset) {
    if (!supabase || deleting) return;
    setDeleting(asset.id);
    const { error: rowError } = await supabase.from("media_assets").delete().eq("id", asset.id);
    if (rowError) {
      setMessage(rowError.message);
      setDeleting(null);
      return;
    }
    const { error: fileError } = await supabase.storage.from("user-media").remove([asset.storage_path]);
    setAssets(current => current.filter(item => item.id !== asset.id));
    setMessage(fileError ? "Asset record removed. Its stored file may need cleanup." : "Asset deleted from your vault.");
    setDeleting(null);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-4 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">YOUR PRIVATE MEDIA LIBRARY</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Smart Vault</h1><p className="mt-2 text-sm text-slate-400">Your captures, organized and stored under your account.</p></div>
          <Link href="/studio" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white">Open Capture Studio ↗</Link>
        </header>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Your library</h2><p className="mt-1 text-xs text-slate-500">{assets.length} saved {assets.length === 1 ? "item" : "items"}</p></div><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, file names and tags..." aria-label="Search Smart Vault" className="w-full max-w-sm rounded-xl border border-white/10 bg-[#121927] px-4 py-3 text-xs text-white outline-none focus:border-blue-400" /></div>
        {tags.length > 1 && <div className="mt-4 flex flex-wrap gap-2">{tags.map(tag => <button key={tag} onClick={() => setActiveTag(tag)} className={activeTag === tag ? "rounded-full bg-blue-600 px-3 py-2 text-[10px] font-bold text-white" : "rounded-full border border-white/10 px-3 py-2 text-[10px] text-slate-400"}>{tag === "All" ? tag : "#" + tag}</button>)}</div>}
        {message && <div role="status" className="mt-6 rounded-xl border border-blue-300/20 bg-blue-300/5 p-4 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 font-bold underline">Sign in</Link>}</div>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading your private library…</p> : filtered.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-5 py-16 text-center"><span className="text-4xl text-slate-600">▧</span><h3 className="mt-4 text-sm font-bold">Your vault is ready for its first capture</h3><p className="mt-2 text-xs text-slate-500">Use SmartTag Studio to capture a photo or video and save it here.</p></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(asset => <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121927]">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-black">{asset.signedUrl && asset.kind === "image" ? <Image src={asset.signedUrl} alt={asset.title || asset.file_name} width={900} height={675} unoptimized className="h-full w-full object-cover" /> : asset.signedUrl && asset.kind === "video" ? <video src={asset.signedUrl} controls playsInline className="h-full w-full object-contain" /> : <span className="text-4xl text-slate-600">▧</span>}</div>
          <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold">{asset.title || asset.file_name}</h3><p className="mt-1 truncate text-[10px] text-slate-500">{asset.file_name}</p></div><span className="rounded-md bg-blue-300/10 px-2 py-1 text-[9px] uppercase text-blue-200">{asset.kind}</span></div>
          <div className="mt-3 flex flex-wrap gap-1">{(asset.tags ?? []).map(tag => <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-blue-200">#{tag}</span>)}</div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500"><span>{readableSize(asset.byte_size)}</span><span>{new Date(asset.created_at).toLocaleDateString()}</span></div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-3">{asset.signedUrl ? <a href={asset.signedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-300">Open file ↗</a> : <span className="text-[10px] text-slate-500">Preview unavailable</span>}<button onClick={() => void deleteAsset(asset)} disabled={deleting === asset.id} className="text-[10px] text-rose-300 disabled:opacity-50">{deleting === asset.id ? "Deleting…" : "Delete"}</button></div></div>
        </article>)}</div>}
      </div>
    </main>
  );
}
