"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Conversation = { id: string; name: string; username: string; lastMessage: string; updatedAt: string };
type Message = { id: string; sender_id: string; body: string; created_at: string; senderName: string };

export default function MessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const loadConversations = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Connect Supabase and apply the SmartTag database migration to enable messaging.");
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in to open your messages.");
      setLoading(false);
      return;
    }
    setUserId(authData.user.id);
    const { data: memberships, error: membershipError } = await supabase.from("conversation_members")
      .select("conversation_id")
      .eq("user_id", authData.user.id);
    if (membershipError) {
      setMessage(membershipError.message);
      setLoading(false);
      return;
    }
    const ids = [...new Set((memberships ?? []).map(row => row.conversation_id))];
    if (!ids.length) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const [{ data: rows, error }, { data: memberRows }] = await Promise.all([
      supabase.from("conversations").select("id, created_at").in("id", ids).order("created_at", { ascending: false }),
      supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    ]);
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    const otherIds = [...new Set((memberRows ?? []).map(row => row.user_id).filter(id => id !== authData.user.id))];
    const [{ data: profiles }, { data: lastMessages }] = await Promise.all([
      otherIds.length ? supabase.from("profiles").select("id, username, display_name").in("id", otherIds) : Promise.resolve({ data: [] }),
      supabase.from("messages").select("conversation_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(ids.length * 2),
    ]);
    const profileMap = new Map((profiles ?? []).map(profile => [profile.id, profile]));
    const messageMap = new Map<string, { body: string; created_at: string }>();
    (lastMessages ?? []).forEach(item => { if (!messageMap.has(item.conversation_id)) messageMap.set(item.conversation_id, item); });
    const memberMap = new Map<string, string>();
    (memberRows ?? []).forEach(item => { if (item.user_id !== authData.user.id && !memberMap.has(item.conversation_id)) memberMap.set(item.conversation_id, item.user_id); });
    const mapped = (rows ?? []).map(row => {
      const profile = profileMap.get(memberMap.get(row.id) ?? "");
      const last = messageMap.get(row.id);
      return {
        id: row.id,
        name: profile?.display_name ?? "SmartTag conversation",
        username: profile?.username ?? "member",
        lastMessage: last?.body ?? "Start a conversation",
        updatedAt: last?.created_at ?? row.created_at,
      };
    }).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setConversations(mapped);
    setSelectedId(current => current || mapped[0]?.id || "");
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!supabase || !conversationId) return;
    const { data, error } = await supabase.from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      setMessage(error.message);
      return;
    }
    const senderIds = [...new Set((data ?? []).map(item => item.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", senderIds)
      : { data: [] };
    const names = new Map((profiles ?? []).map(profile => [profile.id, profile.display_name]));
    setMessages((data ?? []).map(item => ({
      ...item,
      senderName: names.get(item.sender_id) ?? "SmartTag member",
    })));
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { if (selectedId) void loadMessages(selectedId); }, [selectedId, loadMessages]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("conversation");
    if (requested) setSelectedId(requested);
  }, []);

  const activeConversation = useMemo(() => conversations.find(item => item.id === selectedId), [conversations, selectedId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || !supabase || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      sender_id: userId,
      body,
    });
    if (error) setMessage(error.message);
    else {
      setDraft("");
      await loadMessages(selectedId);
      await loadConversations();
    }
    setSending(false);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-3 py-7 text-white sm:px-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between"><div><Link href="/" className="text-xs font-bold text-blue-300">← SMARTTAG HOME</Link><h1 className="mt-3 text-3xl font-black tracking-tight">Messages</h1><p className="mt-1 text-xs text-slate-500">Private conversations with your people.</p></div><Link href="/people" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold">Find people +</Link></header>
        {message && <p role="status" className="mb-4 rounded-xl border border-blue-300/20 bg-blue-300/5 p-3 text-xs leading-6 text-blue-100">{message}{message.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</p>}
        <div className="grid min-h-[68vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111827] md:grid-cols-[290px_1fr]">
          <aside className="border-b border-white/10 md:border-b-0 md:border-r"><div className="border-b border-white/10 p-4"><h2 className="text-sm font-bold">Your conversations</h2></div>
            {loading ? <p className="p-5 text-xs text-slate-500">Loading messages…</p> : conversations.length === 0 ? <p className="p-5 text-xs leading-6 text-slate-500">No conversations yet. Visit Discover Members and start a conversation.</p> : <div className="max-h-[65vh] overflow-y-auto">{conversations.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={selectedId === item.id ? "w-full border-b border-white/5 bg-blue-400/10 p-4 text-left" : "w-full border-b border-white/5 p-4 text-left hover:bg-white/[.03]"}><strong className="block text-xs">{item.name}</strong><span className="mt-1 block truncate text-[10px] text-slate-500">{item.lastMessage}</span></button>)}</div>}
          </aside>
          <section className="flex min-h-[58vh] flex-col">
            {activeConversation ? <>
              <div className="border-b border-white/10 p-4"><h2 className="text-sm font-bold">{activeConversation.name}</h2><p className="mt-1 text-[10px] text-slate-500">@{activeConversation.username}</p></div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 ? <p className="py-12 text-center text-xs text-slate-500">This is the beginning of your conversation.</p> : messages.map(item => <div key={item.id} className={item.sender_id === userId ? "ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-blue-600/80 p-3" : "mr-auto max-w-[82%] rounded-2xl rounded-bl-sm bg-white/[.06] p-3"}><p className="mb-1 text-[9px] font-bold text-blue-100/80">{item.sender_id === userId ? "You" : item.senderName}</p><p className="whitespace-pre-wrap break-words text-xs leading-5">{item.body}</p><time className="mt-2 block text-right text-[9px] text-white/50">{new Date(item.created_at).toLocaleString()}</time></div>)}</div>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3"><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={10000} placeholder="Write a message..." aria-label="Write a message" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090f1a] px-4 py-3 text-xs outline-none focus:border-blue-400" /><button disabled={!draft.trim() || sending} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold disabled:opacity-50">{sending ? "Sending…" : "Send"}</button></form>
            </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><span className="text-4xl text-slate-700">✉</span><h2 className="mt-4 text-sm font-bold">Your conversations live here</h2><p className="mt-2 text-xs text-slate-500">Choose a conversation or discover members to start one.</p></div></div>}
          </section>
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-600">Messages are stored privately and visible only to conversation members. Real-time delivery and media sharing are next-stage improvements.</p>
      </div>
    </main>
  );
}
