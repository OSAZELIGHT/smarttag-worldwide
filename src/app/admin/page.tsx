"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminControl() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('waitlist').select('*').order('created_at', { ascending: false });
      if (data) setList(data);
    };
    getData();
  }, []);

  return (
    <div className="min-h-screen bg-black p-10 text-white font-sans">
      <h1 className="text-4xl font-black text-blue-500 mb-2 tracking-tighter">GC SMART COMMAND</h1>
      <p className="text-gray-500 mb-10 uppercase tracking-widest text-xs">Proprietor: Osaze Light World</p>
      <div className="grid gap-4">
        {list.length === 0 ? <p className="text-gray-600">Awaiting Founding Snappers...</p> : 
          list.map((user) => (
            <div key={user.id} className="p-4 border border-white/10 bg-white/5 rounded-lg flex justify-between items-center">
              <span className="font-mono text-blue-400">{user.email}</span>
              <span className="text-yellow-500 font-bold text-xs uppercase tracking-widest">Founding Snapper</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}