"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!isSupabaseConfigured || !supabase) {
      setError("Account services are not connected yet. Add your Supabase URL and public anon key to the deployment environment first.");
      return;
    }
    if (mode === "signup" && !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      setError("Choose a username with 3–30 letters, numbers, underscores or dots.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim(), username: username.trim().toLowerCase() } },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage("Your account request has been created. Check your email for the confirmation link, then sign in.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b12] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121927] p-7 shadow-2xl sm:p-9">
        <Link href="/" className="mb-9 inline-flex items-center gap-3 text-xl font-black tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-300 to-indigo-600 text-slate-950">S</span>smart<span className="-ml-3 text-blue-300">tag</span></Link>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-blue-300">YOUR WORLD. YOUR PEOPLE.</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{mode === "signup" ? "Join the community." : "Welcome back."}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{mode === "signup" ? "Create your SmartTag identity and start connecting." : "Sign in to continue to your SmartTag community."}</p>
        <div className="mt-7 grid grid-cols-2 rounded-xl bg-[#0b111c] p-1">
          <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={mode === "signup" ? "rounded-lg bg-[#26365e] py-2.5 text-xs font-bold text-white" : "py-2.5 text-xs text-slate-400"}>Create account</button>
          <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={mode === "login" ? "rounded-lg bg-[#26365e] py-2.5 text-xs font-bold text-white" : "py-2.5 text-xs text-slate-400"}>Sign in</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && <>
            <label className="block text-xs font-semibold text-slate-300">Display name<input required value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder="How people know you" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
            <label className="block text-xs font-semibold text-slate-300">Username<input required value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={30} autoComplete="username" placeholder="yourname" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
          </>}
          <label className="block text-xs font-semibold text-slate-300">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
          <label className="block text-xs font-semibold text-slate-300">Password<input required type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b111c] px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
          {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-200">{message}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 disabled:opacity-50">{loading ? "Please wait…" : mode === "signup" ? "Create my SmartTag account →" : "Sign in →"}</button>
        </form>
        <p className="mt-5 text-center text-[10px] leading-5 text-slate-500">By continuing, you agree to use SmartTag respectfully and follow community guidelines.</p>
      </section>
    </main>
  );
}
