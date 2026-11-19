"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Person = { id: string; username: string; display_name: string; bio: string; is_private: boolean };
type FollowState = "pending" | "accepted";

export default function PeopleDirectory() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Record<string, FollowState>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messageBusyId, setMessageBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and apply the SmartTag database migration to discover members.");
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to discover and connect with SmartTag members.");
      setLoading(false);
      return;
    }
    const [{ data: profiles, error }, { data: follows }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, bio, is_private").neq("id", authData.user.id).order("display_name").limit(100),
      supabase.from("follows").select("following_id, status").eq("follower_id", authData.user.id),
    ]);
    if (error) setMessage(error.message);
    else setPeople(profiles ?? []);
    setRelationships(Object.fromEntries((follows ?? []).map(row => [row.following_id, row.status as FollowState])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => people.filter(person =>
    [person.display_name, person.username, person.bio].join(" ").toLowerCase().includes(query.toLowerCase())
  ), [people, query]);

  async function toggleFollow(person: Person) {
    if (!supabase || busyId) return;
    setBusyId(person.id);
    setMessage("");
    const current = relationships[person.id];
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to connect with members.");
      setBusyId(null);
      return;
    }
    const result = current
      ? await supabase.from("follows").delete().eq("follower_id", authData.user.id).eq("following_id", person.id)
      : await supabase.from("follows").insert({ follower_id: authData.user.id, following_id: person.id, status: person.is_private ? "pending" : "accepted" });
    if (result.error) setMessage(result.error.message);
    else {
      setRelationships(old => {
        const next = { ...old };
        if (current) delete next[person.id];
        else next[person.id] = person.is_private ? "pending" : "accepted";
        return next;
      });
      setMessage(current ? "Connection removed." : person.is_private ? "Follow request sent." : "You are now following " + person.display_name + ".");
    }
    setBusyId(null);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-9 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">FIND YOUR PEOPLE</p><h1 className="mt-2 text-3xl font-black tracking-tight">Discover members</h1><p className="mt-2 text-sm text-slate-400">Find creators, meet new people and grow your community.</p></div>
          <Link href="/profile" className="rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300">Profile settings</Link>
        </header>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search names, usernames or bios..." aria-label="Search members" className="mt-7 w-full rounded-xl border border-white/10 bg-[#121927] px-4 py-3 text-sm text-white outline-none focus:border-blue-400" />
        {message && <p role="status" className="mt-4 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</p>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Finding members…</p> : filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No members found. Try another search.</p> : <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(person => {
          const state = relationships[person.id];
          return <article key={person.id} className="rounded-2xl border border-white/10 bg-[#121927] p-5">
            <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-300 to-indigo-700 text-xs font-black text-slate-950">{person.display_name.split(/\s+/).map(part => part[0]).join("").slice(0,2).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-sm font-bold">{person.display_name}</h2><p className="mt-1 text-[10px] text-slate-500">@{person.username}{person.is_private ? " · Private" : ""}</p></div></div>
            <p className="mt-4 min-h-10 text-xs leading-5 text-slate-400">{person.bio || "A SmartTag member. Say hello and start a conversation."}</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void toggleFollow(person)} disabled={busyId === person.id} className={state === "accepted" ? "rounded-xl border border-emerald-400/20 bg-emerald-400/5 py-2.5 text-[10px] font-bold text-emerald-200 disabled:opacity-50" : "rounded-xl bg-blue-600 py-2.5 text-[10px] font-bold text-white disabled:opacity-50"}>{busyId === person.id ? "Please wait…" : state === "pending" ? "Cancel request" : state === "accepted" ? "Following · Remove" : person.is_private ? "Request to follow" : "＋ Follow"}</button><button onClick={() => void startConversation(person)} disabled={messageBusyId === person.id} className="rounded-xl border border-white/10 py-2.5 text-[10px] font-bold text-slate-200 disabled:opacity-50">{messageBusyId === person.id ? "Opening…" : "✉ Message"}</button></div>
          </article>;
        })}</div>}
      </div>
    </main>
  );
}
