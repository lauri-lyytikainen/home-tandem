"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import { ChevronRight } from "lucide-react";

const MEMBER_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-400", "bg-rose-500"];
const DOT_COLORS = ["text-blue-500", "text-emerald-500", "text-violet-400", "text-orange-400", "text-rose-500"];

function balanceLabel(myPct: number, fairPct: number): string {
  if (Math.abs(myPct - fairPct) < 10) return "balanced";
  if (myPct > fairPct) return "you're ahead";
  return "behind";
}

export default function LoadWidget({ onNavigateToFairness }: { onNavigateToFairness: () => void }) {
  const stats = useQuery(api.tasks.fairnessStats, { period: "week" });
  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(new Map());

  useEffect(() => {
    if (!stats) return;
    const ids = stats.map((s) => s.clerkUserId);
    if (ids.length === 0) return;
    getMemberProfiles(ids).then((result) => {
      if ("profiles" in result && result.profiles) {
        setProfiles(new Map(result.profiles.map((p) => [p.id, p])));
      }
    });
  }, [stats]);

  if (!stats || stats.length < 2) return null;

  const total = stats.reduce((s, m) => s + m.total, 0);
  const ordered = [...stats].sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0));

  const fairPct = 100 / ordered.length;
  const me = ordered.find((m) => m.isMe);
  const myPct = me && total > 0 ? (me.total / total) * 100 : fairPct;
  const label = balanceLabel(myPct, fairPct);

  const shares = ordered.map((m) => ({
    pct: total > 0 ? (m.total / total) * 100 : fairPct,
  }));

  return (
    <button
      onClick={onNavigateToFairness}
      className="mx-4 mb-3 bg-background rounded-2xl border border-border px-4 py-3 w-[calc(100%-2rem)] text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">This week's load</span>
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-medium text-emerald-600">{label}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-2">
        {shares.map((s, i) => (
          <div
            key={i}
            className={MEMBER_COLORS[i]}
            style={{ width: `${s.pct}%` }}
          />
        ))}
      </div>

      {/* Member dots */}
      <div className="flex gap-4">
        {ordered.map((m, i) => {
          const profile = profiles.get(m.clerkUserId);
          const name = m.isMe ? "You" : (profile?.name?.split(" ")[0] ?? "Them");
          const pct = total > 0 ? Math.round((m.total / total) * 100) : Math.round(fairPct);
          return (
            <div key={m.membershipId} className="flex items-center gap-1">
              <span className={`text-[10px] ${DOT_COLORS[i]}`}>●</span>
              <span className="text-xs text-muted-foreground">
                {name} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
}
