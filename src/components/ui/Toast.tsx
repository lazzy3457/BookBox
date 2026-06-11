"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type ToastTone = "success" | "error" | "info";

type ToastProps = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  onClose: () => void;
};

const toneStyles: Record<ToastTone, string> = {
  success: "border-mint/60 bg-panel text-paper",
  error: "border-coral/65 bg-panel text-paper",
  info: "border-line bg-panel text-paper"
};

const progressStyles: Record<ToastTone, string> = {
  success: "bg-mint",
  error: "bg-coral",
  info: "bg-muted"
};

export function Toast({ message, tone = "info", durationMs = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 bottom-24 z-50 max-w-sm overflow-hidden rounded border text-sm shadow-2xl shadow-black/40 sm:bottom-5 sm:left-auto sm:right-5 ${toneStyles[tone]}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <p className="leading-6">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-muted transition hover:bg-white/10 hover:text-paper"
          aria-label="Fermer le message"
        >
          <X size={14} />
        </button>
      </div>
      <div className="h-1 bg-white/10">
        <div
          className={`h-full origin-left animate-[toast-progress_5s_linear_forwards] ${progressStyles[tone]}`}
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}
