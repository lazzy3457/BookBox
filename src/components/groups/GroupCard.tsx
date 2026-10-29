import Link from "next/link";
import { MessageCircle, UsersRound } from "lucide-react";
import { GroupEmblem, emblemStyle } from "@/components/groups/GroupEmblem";
import { JoinGroupButton } from "@/components/groups/JoinGroupButton";
import { plural } from "@/lib/format";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emblem: string;
  visibility: "PUBLIC" | "INVITE";
  memberCount: number;
  activity: string | null;
  isMember: boolean;
};

export function GroupCard({ group, isSignedIn }: { group: GroupSummary; isSignedIn: boolean }) {
  const style = emblemStyle(group.emblem);
  return (
    <article className="bb-card flex flex-col overflow-hidden">
      <Link href={`/groups/${group.slug}`} className={`block h-[70px] bg-gradient-to-r ${style.banner}`} aria-hidden tabIndex={-1} />
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5">
        <Link href={`/groups/${group.slug}`} className="-mt-6 w-fit">
          <GroupEmblem emblem={group.emblem} />
        </Link>
        <Link href={`/groups/${group.slug}`} className="bb-h3 hover:text-mint">{group.name}</Link>
        <p className="flex items-center gap-1.5 text-xs font-bold text-muted">
          <UsersRound size={13} aria-hidden />
          {plural(group.memberCount, "membre")} · {group.visibility === "PUBLIC" ? "Public" : "Sur invitation"}
        </p>
        {group.description ? <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{group.description}</p> : null}
        {group.activity ? (
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-bold text-coral">
            <MessageCircle size={13} aria-hidden />
            {group.activity}
          </p>
        ) : null}
        {!group.isMember ? (
          <div className="pt-2">
            <JoinGroupButton groupId={group.id} isMember={false} isSignedIn={isSignedIn} block />
          </div>
        ) : null}
      </div>
    </article>
  );
}
