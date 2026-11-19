"use client";

import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CaptureKind = "image" | "video";
type PendingCapture = { blob: Blob; kind: CaptureKind; fileName: string };

export default function CameraForge() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function startCamera() {
    setMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera access requires a secure browser connection (HTTPS) and a supported device.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setMessage("Camera or microphone permission was not granted. Check your browser permissions and try again.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setMessage("Wait for the camera preview to become ready, then capture your photo.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      setPending({ blob, kind: "image", fileName: `smarttag-photo-${Date.now()}.jpg` });
      setTitle("My SmartTag photo");
      setMessage("Photo captured. Add a title or tags, then save it to your Smart Vault or download it.");
    }, "image/jpeg", 0.92);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setMessage("Video recording is not supported by this browser.");
      return;
    }
    chunksRef.current = [];
    const preferred = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      setPending({ blob, kind: "video", fileName: `smarttag-video-${Date.now()}.${extension}` });
      setTitle("My SmartTag video");
      setMessage("Video ready. Add a title or tags, then save it to your Smart Vault or download it.");
    };
    recorder.start();
    setRecording(true);
    setMessage("Recording started.");
  }

  function stopCamera() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setRecording(false);
  }

  function downloadCapture() {
    if (!pending) return;
    const url = URL.createObjectURL(pending.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = pending.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function saveToVault() {
    if (!pending || saving) return;
    if (pending.blob.size > 524288000) {
      setMessage("This file is larger than the 500 MB Smart Vault upload limit.");
      return;
    }
    if (!pending.blob.type || !["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"].includes(pending.blob.type)) {
      setMessage("This file type is not supported. Choose a JPG, PNG, WEBP, GIF, MP4 or WEBM file.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Smart Vault needs your Supabase project configured. You can download this capture for now.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setMessage("Sign in to save captures to your private Smart Vault.");
        return;
      }
      const extension = pending.fileName.split(".").pop() || (pending.kind === "image" ? "jpg" : "webm");
      const storagePath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
      const file = new File([pending.blob], pending.fileName, { type: pending.blob.type });
      const { error: uploadError } = await supabase.storage.from("user-media").upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: recordError } = await supabase.from("media_assets").insert({
        owner_id: authData.user.id,
        storage_path: storagePath,
        kind: pending.kind,
        file_name: pending.fileName,
        mime_type: file.type || (pending.kind === "image" ? "image/jpeg" : "video/webm"),
        byte_size: file.size,
        title: title.trim(),
        tags: tags.split(",").map(tag => tag.trim().replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 20),
      });
      if (recordError) {
        await supabase.storage.from("user-media").remove([storagePath]);
        throw recordError;
      }
      setMessage("Saved successfully to your private Smart Vault.");
      setPending(null);
      setTitle("");
      setTags("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The capture could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full max-w-xl rounded-3xl border border-blue-400/20 bg-slate-950/80 p-4 text-left shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">SMARTTAG STUDIO</p><h2 className="mt-1 text-xl font-bold">Capture a moment</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-400">{cameraOn ? "CAMERA ON" : "CAMERA OFF"}</span></div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {!cameraOn && <div className="absolute inset-0 grid place-items-center text-center"><div><div className="mb-3 text-4xl text-slate-600">◎</div><p className="text-xs text-slate-400">Your camera preview will appear here</p></div></div>}
        {recording && <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-[10px] font-bold text-white"><i className="h-2 w-2 rounded-full bg-red-500" /> RECORDING</span>}
      </div>
      {message && <p className="mt-3 rounded-lg bg-blue-400/10 p-3 text-xs leading-5 text-blue-100" role="status">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2"><label className="cursor-pointer rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-slate-200 hover:bg-white/10">↑ Upload file<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const kind = file.type.startsWith("video/") ? "video" : "image"; setPending({ blob: file, kind, fileName: file.name }); setTitle(file.name.replace(/\.[^.]+$/, "")); setMessage("File selected. Add tags and save it to your Smart Vault."); event.target.value = ""; }} /></label>
        {!cameraOn ? <button onClick={startCamera} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-500">Enable camera</button> : <>
          <button onClick={capturePhoto} className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white hover:bg-white/10">◎ Capture photo</button>
          {!recording ? <button onClick={startRecording} className="rounded-xl border border-red-400/40 px-4 py-3 text-xs font-bold text-red-200 hover:bg-red-400/10">● Record video</button> : <button onClick={() => { recorderRef.current?.stop(); setRecording(false); }} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white">Stop recording</button>}
          <button onClick={stopCamera} className="ml-auto rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300">Turn off</button>
        </>}
      </div>
      {pending && <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-3">
        <div className="mb-3 flex items-center justify-between"><strong className="text-xs text-white">Capture ready · {pending.kind}</strong><button onClick={() => setPending(null)} className="text-xs text-slate-400">Discard</button></div>
        <label className="mb-3 block text-[10px] text-slate-400">Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Give this capture a name" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-400" /></label>
        <label className="mb-3 block text-[10px] text-slate-400">Tags (comma-separated)<input value={tags} onChange={event => setTags(event.target.value)} maxLength={300} placeholder="family, travel, project" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-400" /></label>
        <div className="flex flex-wrap gap-2"><button onClick={downloadCapture} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs text-slate-200">Download</button><button onClick={() => void saveToVault()} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save to Smart Vault"}</button></div>
      </div>}
      <p className="mt-4 text-[10px] leading-5 text-slate-500">Your camera capture stays on this device until you choose to save it. Smart Vault uploads are private to your account.</p>
    </section>
  );
}
