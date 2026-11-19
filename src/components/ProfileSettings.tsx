"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Profile = { username: string; display_name: string; bio: string; is_private: boolean };

export default function ProfileSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ username: "", display_name: "", bio: "", is_private: false });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Connect Supabase and apply the SmartTag database migration before setting up a profile.");
      setLoading(false);
      return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Sign in to view and edit your profile.");
      setLoading(false);
      return;
    }
    setEmail(authData.user.email ?? "");
    const { data, error: profileError } = await supabase.from("profiles")
      .select("username, display_name, bio, is_private")
      .eq("id", authData.user.id)
      .single();
    if (profileError) setError(profileError.message);
    else if (data) setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    const username = profile.username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      setError("Username must be 3–30 characters using letters, numbers, dots or underscores.");
      setSaving(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.from("profiles").update({
      username,
      display_name: profile.display_name.trim(),
      bio: profile.bio.trim(),
      is_private: profile.is_private,
      updated_at: new Date().toISOString(),
    }).eq("id", authData.user.id);
    if (updateError) setError(updateError.message);
    else {
      setProfile(current => ({ ...current, username }));
      setMessage("Your profile has been updated.");
    }
    setSaving(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-10 text-white sm:px-8">
      <section className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link>
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#121927] p-6 sm:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">YOUR IDENTITY</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Profile settings</h1>
          <p className="mt-2 text-sm text-slate-400">Choose how people see you across SmartTag.</p>
          {loading ? <p className="mt-8 text-sm text-slate-500">Loading your profile…</p> : error && !email ? <div className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100">{error}<div className="mt-3"><Link href="/auth" className="font-bold underline">Go to sign in</Link></div></div> : <form onSubmit={save} className="mt-8 space-y-5">
            <div className="rounded-xl bg-black/20 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Signed in as</p><p className="mt-1 text-sm text-slate-200">{email}</p></div>
            <label className="block text-xs font-semibold text-slate-300">Display name<input required value={profile.display_name} onChange={event => setProfile(current => ({ ...current, display_name: event.target.value }))} maxLength={80} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
            <label className="block text-xs font-semibold text-slate-300">Username<input required value={profile.username} onChange={event => setProfile(current => ({ ...current, username: event.target.value }))} minLength={3} maxLength={30} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /><span className="mt-1 block text-[10px] text-slate-500">Your public SmartTag handle.</span></label>
            <label className="block text-xs font-semibold text-slate-300">Bio<textarea value={profile.bio} onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))} maxLength={500} rows={4} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" placeholder="Tell your community a little about yourself." /></label>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-xs text-slate-300"><input type="checkbox" checked={profile.is_private} onChange={event => setProfile(current => ({ ...current, is_private: event.target.checked }))} className="h-4 w-4 accent-blue-500" /><span><strong className="block text-white">Private profile</strong><span className="mt-1 block text-slate-500">Limit profile and post visibility to approved followers.</span></span></label>
            {error && <p role="alert" className="rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-emerald-400/10 p-3 text-xs text-emerald-200">{message}</p>}
            <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button><button type="button" onClick={() => void signOut()} className="rounded-xl border border-white/10 px-5 py-3 text-xs text-slate-300">Sign out</button></div>
          </form>}
        </div>
      </section>
    </main>
  );
}
