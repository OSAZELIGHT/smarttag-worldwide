import type { Metadata } from "next";
import Link from "next/link";
import CameraForge from "@/components/CameraForge";

export const metadata: Metadata = {
  title: "Capture Studio | SmartTag Worldwide",
  description: "Capture photos and videos and save them to your private Smart Vault.",
};

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link>
        <div className="mb-7 mt-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">CREATE AND ORGANIZE</p><h1 className="mt-2 text-3xl font-black tracking-tight">SmartTag Studio</h1><p className="mt-2 text-sm text-slate-400">Capture a moment, add your own tags and keep it in your private vault.</p></div>
        <CameraForge />
        <div className="mt-6"><Link href="/vault" className="text-xs font-bold text-blue-300">Open your Smart Vault →</Link></div>
      </div>
    </main>
  );
}
