"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useConfirm } from "@/components/ui/useConfirm";

type JoinGroupButtonProps = {
  groupId: string;
  isMember: boolean;
  isSignedIn: boolean;
  block?: boolean;
  tone?: "default" | "onBanner";
};

// « Rejoindre » / « Membre » : un clic sur « Membre » propose de quitter le groupe.
export function JoinGroupButton({ groupId, isMember: initial, isSignedIn, block = false, tone = "default" }: JoinGroupButtonProps) {
  const router = useRouter();
  const [isMember, setIsMember] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const width = block ? "w-full" : "";

  if (!isSignedIn) {
    return (
      <Link href="/login?callbackUrl=/commu?tab=groupes" className={`bb-btn-primary ${width} py-2.5`}>
        <Plus size={15} aria-hidden />
        Rejoindre
      </Link>
    );
  }

  async function toggle() {
    if (isMember && !(await confirm({ title: "Quitter ce groupe ?", message: "Tu pourras le rejoindre à nouveau plus tard.", confirmLabel: "Quitter" }))) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/groups/${groupId}/membership`, { method: isMember ? "DELETE" : "POST" });
    setBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "L'action n'a pas pu aboutir.");
      return;
    }
    setIsMember(!isMember);
    router.refresh();
  }

  const memberClass = tone === "onBanner" ? "bb-btn bg-ink text-paper hover:bg-panel" : "bb-btn-outline";

  return (
    <div className={block ? "w-full" : ""}>
      {confirmDialog}
      <button type="button" onClick={() => void toggle()} disabled={busy} aria-pressed={isMember} className={`${isMember ? memberClass : "bb-btn-primary"} ${width} py-2.5`}>
        {isMember ? <Check size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
        {isMember ? "Membre" : "Rejoindre"}
      </button>
      {error ? <p role="alert" className="mt-1 text-xs font-bold text-coral">{error}</p> : null}
    </div>
  );
}
