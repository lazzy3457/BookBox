import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getReleaseCalendar } from "@/server/services/releaseCalendar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReleaseCalendar } from "@/components/calendar/ReleaseCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendrier des sorties",
  description: "Les livres qui viennent de sortir et ceux qui arrivent bientôt."
};

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  const calendar = await getReleaseCalendar(session?.user?.id);

  return (
    <div className="min-w-0 overflow-hidden">
      <SectionHeader
        eyebrow="Sorties"
        title="Calendrier"
        description="Les livres qui arrivent bientôt et ceux qui viennent de sortir. Les auteurs de ta bibliothèque sont mis en avant."
      />
      <ReleaseCalendar
        today={calendar.today}
        items={calendar.items}
        followedAuthors={calendar.followedAuthors}
        isSignedIn={Boolean(session?.user?.id)}
      />
    </div>
  );
}
