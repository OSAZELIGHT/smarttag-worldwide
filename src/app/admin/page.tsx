"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AdminControl() {
  const [status, setStatus] = useState("Checking administrator access…");

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      if (!isSupabaseConfigured || !supabase) {
        if (active) setStatus("Supabase is not configured. Connect the project and complete the authentication setup before enabling administration.");
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setStatus("Sign in with an authorized administrator account to continue.");
        return;
      }
      if (data.user.app_metadata?.role !== "admin") {
        setStatus("This account does not have administrator privileges.");
        return;
      }
      setStatus("Administrator identity verified. The management modules will appear after the protected database policies and admin tools are installed.");
    }
    void checkAccess();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-[#090b12] px-5 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#111827] p-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">GC Smart Technology</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">SmartTag Control Centre</h1>
        <p className="mt-2 text-sm text-slate-400">Platform administration and community safety.</p>
        <div className="mt-8 rounded-xl border border-blue-300/20 bg-blue-400/5 p-5 text-sm leading-7 text-slate-200" role="status">{status}</div>
        <p className="mt-5 text-xs leading-6 text-slate-500">Administrative data is intentionally not queried from this public page. Production administration must be enforced by server-side authorization and Supabase row-level security, not by hiding interface elements.</p>
        <Link className="mt-6 inline-block text-sm text-blue-300 hover:text-blue-200" href="/">← Return to SmartTag</Link>
      </section>
    </main>
  );
}
