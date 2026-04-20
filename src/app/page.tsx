"use client";
import React, { useState } from 'react';

export default function SmarttagHome() {
  const [status, setStatus] = useState("Join the Founding 100");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8 h-48 w-48 animate-pulse">
        <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-20 rounded-full"></div>
        <div className="relative z-10 flex h-full w-full items-center justify-center border-4 border-blue-500 bg-black rotate-45 shadow-[0_0_60px_rgba(59,130,246,0.6)]">
          <div className="h-24 w-24 border-2 border-yellow-400 bg-transparent flex items-center justify-center">
             <span className="text-yellow-400 font-bold -rotate-45 text-3xl italic tracking-tighter">ST</span>
          </div>
        </div>
      </div>
      <h1 className="mb-2 text-6xl font-black tracking-tighter uppercase sm:text-8xl">
        SMART<span className="text-blue-500">TAG</span>
      </h1>
      <p className="mb-10 text-xl font-medium tracking-widest text-gray-400 uppercase">
        Developed by <span className="text-yellow-500 underline decoration-2 underline-offset-8">GC Smart Technology</span>
      </p>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold text-white tracking-tight">{status}</h2>
        <input type="email" placeholder="Professional Email" className="mb-4 w-full rounded-lg bg-black border border-blue-500 p-4 text-white focus:ring-2 focus:ring-yellow-400 outline-none transition-all" />
        <button onClick={() => setStatus("Link Established. Welcome.")} className="w-full rounded-lg bg-blue-600 p-4 font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Claim Early Access</button>
      </div>
      <footer className="mt-16 text-[10px] font-bold uppercase tracking-[0.5em] text-gray-700">
        Benin City // Worldwide // Universal View
      </footer>
    </main>
  );
}
