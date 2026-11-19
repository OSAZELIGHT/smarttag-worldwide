"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Community = { id: string; name: string; slug: string; description: string; is_private: boolean; owner_id: string };
type Membership = { community_id: string; role: string };

export default function CommunitiesHub() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and apply the SmartTag database migration to enable communities.");
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to discover and join communities.");
      setLoading(false);
      return;
    }
    setUserId(authData.user.id);
    const [{ data: rows, error }, { data: mine }] = await Promise.all([
      supabase.from("communities").select("id, name, slug, description, is_private, owner_id").order("created_at", { ascending: false }).limit(100),
      supabase.from("community_members").select("community_id, role").eq("user_id", authData.user.id),
    ]);
    if (error) setMessage(error.message);
    else setCommunities(rows ?? []);
    setMemberships(Object.fromEntries((mine ?? []).map((row: Membership) => [row.community_id, row.role])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || creating || !userId) return;
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setMessage("Community names must contain at least two characters.");
      return;
    }
    setCreating(true);
    const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "community";
    const slug = slugBase + "-" + crypto.randomUUID().slice(0, 6);
    const { data, error } = await supabase.from("communities").insert({
      owner_id: userId,
      name: cleanName,
      slug,
      description: description.trim(),
      is_private: isPrivate,
    }).select("id").single();
    if (error || !data) {
      setMessage(error?.message ?? "The community could not be created.");
      setCreating(false);
      return;
    }
    const { error: memberError } = await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: userId,
      role: "owner",
    });
    if (memberError) setMessage("Community created, but owner membership could not be added: " + memberError.message);
    else {
      setMessage("Your community has been created.");
      setName("");
      setDescription("");
      setIsPrivate(false);
      await load();
    }
    setCreating(false);
  }

  async function toggleMembership(community: Community) {
    if (!supabase || !userId) return;
    const role = memberships[community.id];
    if (role === "owner") {
      setMessage("Transfer ownership before leaving a community you own.");
      return;
    }
    const result = role
      ? await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", userId)
      : community.is_private
        ? null
        : await supabase.from("community_members").insert({ community_id: community.id, user_id: userId, role: "member" });
    if (!result) {
      setMessage("This is a private community. Ask its owner for an invitation.");
      return;
    }
    if (result.error) setMessage(result.error.message);
    else {
      setMemberships(current => {
        const next = { ...current };
        if (role) delete next[community.id];
        else next[community.id] = "member";
        return next;
      });
      setMessage(role ? "You left the community." : "You joined the community.");
    }
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-9 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-white/10 pb-6"><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">BELONG TO SOMETHING</p><h1 className="mt-2 text-3xl font-black tracking-tight">Communities</h1><p className="mt-2 text-sm text-slate-400">Find people around shared interests or start a space of your own.</p></header>
        {message && <p role="status" className="mt-5 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</p>}
        <section className="mt-7 rounded-2xl border border-white/10 bg-[#121927] p-5">
          <h2 className="text-sm font-bold">Create a community</h2>
          <form onSubmit={createCommunity} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] text-slate-400">Community name<input required value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="e.g. Smart Creators Circle" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-3 py-3 text-xs text-white outline-none focus:border-blue-400" /></label>
            <label className="text-[10px] text-slate-400">Description<input value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} placeholder="What brings members together?" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-3 py-3 text-xs text-white outline-none focus:border-blue-400" /></label>
            <label className="flex items-center gap-2 text-[10px] text-slate-300 sm:col-span-2"><input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} className="h-4 w-4 accent-blue-500" />Private community (invitation required)</label>
            <button disabled={creating || !name.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold disabled:opacity-50 sm:col-span-2">{creating ? "Creating…" : "Create community"}</button>
          </form>
        </section>
        <div className="mt-8 flex items-end justify-between"><div><h2 className="text-lg font-bold">Explore communities</h2><p className="mt-1 text-xs text-slate-500">{communities.length} spaces available to your account</p></div></div>
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading communities…</p> : communities.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No communities yet. Create the first one.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{communities.map(community => {
          const role = memberships[community.id];
          return <article key={community.id} className="rounded-2xl border border-white/10 bg-[#121927] p-5"><div className="flex items-center justify-between gap-2"><span className="rounded-md bg-blue-300/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">{community.is_private ? "Private" : "Public"}</span>{role && <span className="text-[9px] text-emerald-300">{role === "owner" ? "Owner" : "Member"}</span>}</div><h3 className="mt-4 text-sm font-bold">{community.name}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-slate-400">{community.description || "A SmartTag community space."}</p><p className="mt-3 text-[9px] text-slate-600">/{community.slug}</p><button onClick={() => void toggleMembership(community)} className={role ? "mt-4 w-full rounded-xl border border-white/10 py-2.5 text-xs text-slate-300" : "mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"}>{role === "owner" ? "Community owner" : role ? "Leave community" : community.is_private ? "Invite required" : "Join community"}</button></article>;
        })}</div>}
      </div>
    </main>
  );
}
