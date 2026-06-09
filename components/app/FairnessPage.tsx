"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import { CATEGORY_META, CATEGORY_OPTIONS } from "./taskUtils";
import { Info } from "lucide-react";

type Period = "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

// Distinct colors per member slot (you, then others)
const MEMBER_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500"];
const DOT_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-400", "bg-rose-500"];

function buildInsight(
  stats: { isMe: boolean; total: number; byCategory: Record<string, number> }[],
  period: Period,
): string {
  const total = stats.reduce((s, m) => s + m.total, 0);
  if (total === 0) return "No completed tasks yet for this period.";

  const me = stats.find((m) => m.isMe);
  if (!me || stats.length < 2) return "";

  const fairShare = total / stats.length;
  const myPct = total > 0 ? (me.total / total) * 100 : 0;
  const fairPct = 100 / stats.length;
  const periodLabel = period === "week" ? "this week" : period === "month" ? "this month" : "overall";

  let balance = "";
  if (Math.abs(myPct - fairPct) < 10) {
    balance = `Roughly even ${periodLabel}.`;
  } else if (me.total > fairShare) {
    balance = `You're carrying more of the load ${periodLabel}.`;
  } else {
    balance = `Others are doing more of the heavy lifting ${periodLabel}.`;
  }

  // Categories where you do more vs everyone else combined
  const othersTotal = (cat: string) =>
    stats.filter((m) => !m.isMe).reduce((s, m) => s + (m.byCategory[cat] ?? 0), 0);

  const myMore: string[] = [];
  const theirMore: string[] = [];
  for (const cat of CATEGORY_OPTIONS) {
    const myN = me.byCategory[cat] ?? 0;
    const theirN = othersTotal(cat);
    const catTotal = myN + theirN;
    if (catTotal === 0) continue;
    if (myN / catTotal > 0.6) myMore.push(CATEGORY_META[cat].label.toLowerCase());
    else if (theirN / catTotal > 0.6) theirMore.push(CATEGORY_META[cat].label.toLowerCase());
  }

  const parts: string[] = [];
  if (myMore.length > 0) parts.push(`You did more of the ${myMore.join(" & ")}`);
  if (theirMore.length > 0) parts.push(`others took more of the ${theirMore.join(" & ")}`);

  if (parts.length === 0) return balance;
  return `${balance} ${parts.join("; ")}.`;
}

function TwoColorBar({ shares }: { shares: { pct: number; colorClass: string }[] }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-muted w-full">
      {shares.map((s, i) => (
        <div
          key={i}
          className={s.colorClass}
          style={{ width: `${s.pct}%`, transition: "width 0.4s ease" }}
        />
      ))}
    </div>
  );
}

export default function FairnessPage() {
  const [period, setPeriod] = useState<Period>("week");
  const stats = useQuery(api.tasks.fairnessStats, { period });
  const household = useQuery(api.households.getHousehold);
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

  if (!stats || !household) return null;

  const total = stats.reduce((s, m) => s + m.total, 0);

  // Stable order: me first, then others
  const ordered = [...stats].sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0));

  const shares = ordered.map((m, i) => ({
    pct: total > 0 ? (m.total / total) * 100 : 100 / ordered.length,
    colorClass: MEMBER_COLORS[i] ?? MEMBER_COLORS[0],
  }));

  const insight = buildInsight(stats, period);

  return (
    <div className="flex flex-col grow min-h-0 overflow-y-auto pb-8">
      <div className="px-4 pt-6 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
          The honest picture
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Fairness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A picture of the load — not a scoreboard.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 px-4 mt-3 mb-4">
        {(["week", "month", "all"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Overview card */}
      <div className="mx-4 bg-background rounded-2xl border border-border p-4 mb-4">
        <TwoColorBar shares={shares} />

        <div className="mt-3 flex flex-col gap-2">
          {ordered.map((m, i) => {
            const profile = profiles.get(m.clerkUserId);
            const name = m.isMe ? "You" : (profile?.name?.split(" ")[0] ?? "Them");
            const pct = total > 0 ? Math.round((m.total / total) * 100) : 0;
            return (
              <div key={m.membershipId} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLORS[i]}`} />
                <span className="text-sm font-medium flex-1">{name}</span>
                <span className="text-sm text-muted-foreground">{m.total} tasks</span>
                <span className="text-sm font-bold w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>

        {insight && (
          <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>{insight}</p>
          </div>
        )}
      </div>

      {/* By category */}
      <div className="px-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          By category
        </p>
        <div className="flex flex-col gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const catTotal = ordered.reduce((s, m) => s + (m.byCategory[cat] ?? 0), 0);
            if (catTotal === 0) return null;

            const catShares = ordered.map((m, i) => ({
              pct: catTotal > 0 ? ((m.byCategory[cat] ?? 0) / catTotal) * 100 : 0,
              colorClass: MEMBER_COLORS[i] ?? MEMBER_COLORS[0],
            }));

            return (
              <div key={cat} className="bg-background rounded-2xl border border-border px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{catTotal} done</span>
                </div>

                <div className="flex items-center gap-2">
                  <TwoColorBar shares={catShares} />
                  <div className="flex gap-2 shrink-0">
                    {ordered.map((m, i) => (
                      <div key={m.membershipId} className="flex items-center gap-1">
                        <Avatar className="w-5 h-5">
                          {profiles.get(m.clerkUserId)?.imageUrl && (
                            <AvatarImage
                              src={profiles.get(m.clerkUserId)!.imageUrl}
                              alt={profiles.get(m.clerkUserId)!.name}
                            />
                          )}
                          <AvatarFallback
                            className={`text-[9px] text-white ${MEMBER_COLORS[i]}`}
                          >
                            {(m.isMe
                              ? "Me"
                              : profiles.get(m.clerkUserId)?.name?.slice(0, 1) ?? "?"
                            ).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {m.byCategory[cat] ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {total === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No completed tasks for this period yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
