"use client";
import React, { useState } from 'react';
import CameraForge from '@/components/CameraForge';

export default function SmarttagHome() {
  const [showForge, setShowForge] = useState(false);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-10">
        <h1 className="text-6xl font-black uppercase tracking-tighter">SMART<span className="text-blue-500">TAG</span></h1>
        <p className="text-gray-500 uppercase tracking-[0.3em] text-[10px]">GC Smart Technology</p>
      </div>

      {!showForge ? (
        <button onClick={() => setShowForge(true)} className="group relative rounded-full bg-blue-600 px-12 py-6 text-2xl font-black uppercase tracking-tighter transition-all hover:bg-blue-700 active:scale-95">
          Enter The Forge
          <div className="absolute -inset-1 animate-pulse rounded-full bg-blue-400 opacity-20 blur-xl"></div>
        </button>
      ) : (
        <CameraForge />
      )}
    </main>
  );
}
