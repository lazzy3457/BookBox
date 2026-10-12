import type { Metadata } from "next";
import { LegalNoticeWorkspace } from "@/components/moderation/LegalNoticeWorkspace";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Signaler un contenu illicite",
  description: "Notifier BooksBox d’un contenu potentiellement illicite et suivre son traitement.",
  alternates: { canonical: "/signalement" }
};

export default function LegalNoticePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader eyebrow="Modération" title="Signalement légal" description="Ce formulaire est accessible sans compte. Pour un simple spoiler, spam ou désaccord communautaire, utilise plutôt le bouton Signaler associé au contenu." />
      <LegalNoticeWorkspace />
    </div>
  );
}
