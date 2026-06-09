"use client";

import { useEffect, useState } from "react";
import { Share, Plus } from "lucide-react";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (isStandalone || !isIOS || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background border border-border rounded-2xl shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192x192.png" alt="Home Tandem" className="w-12 h-12 rounded-2xl shadow-sm" />
            <div>
              <p className="font-semibold text-sm">Add to Home Screen</p>
              <p className="text-xs text-muted-foreground">Get the full app experience</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground text-lg leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <Share className="w-4 h-4 text-white" />
            </div>
            <span>Tap the <strong className="text-foreground">Share</strong> button in Safari</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
              <Plus className="w-4 h-4 text-foreground" />
            </div>
            <span>Tap <strong className="text-foreground">Add to Home Screen</strong></span>
          </div>
        </div>

        {/* Caret pointing down */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
          <div className="w-3 h-3 bg-background border-r border-b border-border rotate-45 translate-y-[-50%] mx-auto" />
        </div>
      </div>
    </div>
  );
}
