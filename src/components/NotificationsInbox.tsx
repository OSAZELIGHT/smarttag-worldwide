"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Notice = { id: string; kind: string; entity_id: string | null; actorName: string; username: string; read_at: string | null; created_at: string };

function describe(kind: string) {
  if (kind === "follow") return "started following you or approved your follow request.";
  if (kind === "reaction") return "reacted to your post.";
  if (kind === "comment") return "commented on your post.";
  if (kind === "message") return "sent you a message.";
  if (kind === "mention") return "mentioned you.";
  if (kind === "community_invite") return "invited you to a community.";
  return "interacted with you.";
}

export default function NotificationsInbox() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase to enable notifications.");
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to view your notifications.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("notifications")
      .select("id, actor_id, kind, entity_id, read_at, created_at")
      .eq("recipient_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const actorIds = [...new Set((data ?? []).map(item => item.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = actorIds.length
      ? await supabase.from("profiles").select("id, display_name, username").in("id", actorIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
    setItems((data ?? []).map(item => {
      const actor = profileMap.get(item.actor_id ?? "");
      return {
        id: item.id,
        kind: item.kind,
        entity_id: item.entity_id,
        actorName: actor?.display_name ?? "A SmartTag member",
        username: actor?.username ?? "member",
        read_at: item.read_at,
        created_at: item.created_at,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    if (!supabase) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    if (error) setMessage(error.message);
    else setItems(current => current.map(item => item.id === id ? { ...item, read_at: readAt } : item));
  }

  async function markAllRead() {
    if (!supabase) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("recipient_id", authData.user.id).is("read_at", null);
    if (error) setMessage(error.message);
    else setItems(current => current.map(item => ({ ...item, read_at: item.read_at ?? readAt })));
  }

  const unread = items.filter(item => !item.read_at).length;

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-9 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-end justify-between gap-4 border-b border-white/10 pb-6"><div><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">YOUR UPDATES</p><h1 className="mt-2 text-3xl font-black tracking-tight">Notifications</h1><p className="mt-2 text-sm text-slate-400">{unread} unread updates</p></div><button onClick={() => void markAllRead()} disabled={!unread} className="rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300 disabled:opacity-40">Mark all read</button></header>
        {message && <p role="status" className="mt-5 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</p>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading notifications…</p> : items.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-16 text-center"><span className="text-4xl text-slate-700">♧</span><h2 className="mt-4 text-sm font-bold">You are all caught up</h2><p className="mt-2 text-xs text-slate-500">New follows, reactions, comments and messages will appear here.</p></div> : <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#121927]">{items.map(item => <div key={item.id} className={item.read_at ? "flex items-start gap-3 border-b border-white/5 p-4" : "flex items-start gap-3 border-b border-white/5 bg-blue-400/[.06] p-4"}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-300/10 text-sm text-blue-200">{item.kind === "message" ? "✉" : item.kind === "follow" ? "＋" : item.kind === "comment" ? "☷" : "♡"}</span><div className="min-w-0 flex-1"><p className="text-xs leading-5"><strong>{item.actorName}</strong> {describe(item.kind)}</p><p className="mt-1 text-[10px] text-slate-500">@{item.username} · {new Date(item.created_at).toLocaleString()}</p><div className="mt-2 flex gap-3"><Link href={item.kind === "message" && item.entity_id ? "/messages?conversation=" + item.entity_id : item.kind === "follow" ? "/profile" : "/"} onClick={() => { if (!item.read_at) void markRead(item.id); }} className="text-[10px] font-bold text-blue-300">Open</Link>{!item.read_at && <button onClick={() => void markRead(item.id)} className="text-[10px] text-slate-400">Mark read</button>}</div></div>{!item.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />}</div>)}</div>}
      </div>
    </main>
  );
}
