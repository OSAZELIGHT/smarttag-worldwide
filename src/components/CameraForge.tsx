"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraForge() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smarttag-capture-${Date.now()}.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Photo captured. It was downloaded to this device; cloud vault upload is not connected yet.");
    }, "image/jpeg", 0.92);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setMessage("Video recording is not supported by this browser.");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smarttag-video-${Date.now()}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Video recording downloaded to this device. Cloud publishing is not connected yet.");
    };
    recorder.start();
    setRecording(true);
    setMessage("Recording started.");
  }

  function stopCamera() {
    if (recording) recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setRecording(false);
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
      <div className="mt-4 flex flex-wrap gap-2">
        {!cameraOn ? <button onClick={startCamera} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-500">Enable camera</button> : <>
          <button onClick={capturePhoto} className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white hover:bg-white/10">◎ Capture photo</button>
          {!recording ? <button onClick={startRecording} className="rounded-xl border border-red-400/40 px-4 py-3 text-xs font-bold text-red-200 hover:bg-red-400/10">● Record video</button> : <button onClick={() => { recorderRef.current?.stop(); setRecording(false); }} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white">Stop recording</button>}
          <button onClick={stopCamera} className="ml-auto rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300">Turn off</button>
        </>}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-slate-500">Capture works locally in your browser. Files are downloaded to your device; account-based cloud storage and publishing will be connected in a later backend phase.</p>
    </section>
  );
}
