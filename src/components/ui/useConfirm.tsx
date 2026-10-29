"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
};

type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

// Fenêtre de confirmation commune à toutes les suppressions : `const [confirm, dialog] = useConfirm()`,
// puis `if (!(await confirm({ title: "…" }))) return;` et `{dialog}` dans le rendu.
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const dialog = pending && typeof document !== "undefined" ? createPortal(<ConfirmDialog options={pending} onClose={close} />, document.body) : null;
  return [confirm, dialog] as const;
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (value: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone !== "default";

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button type="button" aria-label="Annuler" onClick={() => onClose(false)} className="absolute inset-0 bg-paper/35 backdrop-blur-[2px]" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="bb-card relative flex w-full max-w-md flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {danger ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral/10 text-coral"><TriangleAlert size={18} aria-hidden /></span>
          ) : null}
          <div>
            <h2 id="confirm-title" className="bb-h3">{options.title}</h2>
            {options.message ? <p className="mt-1 text-sm leading-relaxed text-muted">{options.message}</p> : null}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onClose(false)} className="bb-btn-soft px-4 py-2.5 text-sm">Annuler</button>
          <button ref={confirmRef} type="button" onClick={() => onClose(true)} className={`bb-btn px-4 py-2.5 text-sm ${danger ? "bg-coral text-white hover:bg-coral/90" : "bg-mint text-ink hover:bg-lime"}`}>
            {options.confirmLabel ?? "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
