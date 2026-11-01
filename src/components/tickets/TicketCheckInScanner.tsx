"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Camera, CameraOff, CheckCircle2 } from "lucide-react";

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export function TicketCheckInScanner({ eventId }: { eventId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkIn = useCallback(async (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/ticketing/manage/events/${encodeURIComponent(eventId)}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: clean }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check in this ticket");
      setNotice(`${result.ticket.buyerName} · ${result.ticket.type} · entry confirmed`);
      setCode("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check in this ticket");
    } finally {
      setBusy(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!cameraOn) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera QR scanning. Enter the ticket code below instead.");
      setCameraOn(false);
      return;
    }
    const detector = new Detector({ formats: ["qr_code"] });

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) {
              setCameraOn(false);
              await checkIn(found[0].rawValue);
              return;
            }
          } catch {
            // Continue scanning after a frame that cannot be decoded.
          }
          timer = setTimeout(() => void scan(), 350);
        };
        void scan();
      } catch {
        setError("Camera access was unavailable. Check browser permission or enter the ticket code below.");
        setCameraOn(false);
      }
    };
    void start();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOn, checkIn]);

  return (
    <section className="border border-charcoal-200 p-5 dark:border-charcoal-800" aria-labelledby="check-in-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">Gate entry</p><h2 id="check-in-title" className="mt-1 font-display text-xl font-semibold">Scan a ticket</h2></div>
        <Button type="button" variant={cameraOn ? "outline" : "dark"} onClick={() => { setError(""); setCameraOn((value) => !value); }}>
          {cameraOn ? <CameraOff className="mr-2 h-4 w-4" aria-hidden="true" /> : <Camera className="mr-2 h-4 w-4" aria-hidden="true" />}
          {cameraOn ? "Stop camera" : "Open camera"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-charcoal-600 dark:text-charcoal-300">Each ticket can be checked in once. The camera needs permission; you can also enter the code printed below the QR.</p>
      {cameraOn && <video ref={videoRef} muted playsInline className="mt-4 aspect-video w-full max-w-xl bg-charcoal-950 object-cover" aria-label="Ticket QR camera preview" />}
      <form onSubmit={(event) => { event.preventDefault(); void checkIn(code); }} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1"><Input label="Ticket code" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Scan or enter the ticket code" /></div>
        <Button type="submit" disabled={busy || code.trim().length < 20}>{busy ? "Checking…" : "Confirm entry"}</Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-terracotta-700 dark:text-terracotta-300">{error}</p>}
      {notice && <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-olive-700 dark:text-olive-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{notice}</p>}
    </section>
  );
}
