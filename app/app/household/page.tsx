"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getMemberProfiles, type MemberProfile } from "./_actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Link2, Pencil, X } from "lucide-react";

// A Convex tokenIdentifier is `${issuer}|${subject}`. The subject is the
// Clerk user id, which is what the Clerk backend API needs to resolve a
// member's display name and avatar.
function clerkUserIdFromToken(tokenIdentifier: string) {
  return tokenIdentifier.split("|").pop() ?? tokenIdentifier;
}

export default function HouseholdPage() {
  const router = useRouter();
  const { user } = useUser();

  const household = useQuery(api.households.getHousehold);
  const renameHousehold = useMutation(api.households.rename);
  const removeMember = useMutation(api.households.removeMember);

  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // `HouseholdGate` (in the layout) redirects anyone without a household —
  // including someone removed while viewing this very page — to onboarding.

  useEffect(() => {
    if (!household) return;
    const ids = household.members.map((m) => clerkUserIdFromToken(m.tokenIdentifier));
    let cancelled = false;
    getMemberProfiles(ids).then((result) => {
      if (cancelled || "error" in result) return;
      const next: Record<string, MemberProfile> = {};
      for (const profile of result.profiles) next[profile.id] = profile;
      setProfiles(next);
    });
    return () => {
      cancelled = true;
    };
  }, [household]);

  if (household === undefined || household === null) {
    return (
      <div className="flex flex-col min-h-svh">
        <Header onBack={() => router.back()} />
      </div>
    );
  }

  function startEditingName() {
    setNameDraft(household!.name);
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (!name) {
      setNameError("Household name cannot be empty");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      await renameHousehold({ name });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not rename household");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleRemove(membershipId: Id<"householdMemberships">, memberName: string) {
    if (!window.confirm(`Remove ${memberName} from the household?`)) return;
    setActionError(null);
    setRemovingId(membershipId);
    try {
      await removeMember({ membershipId });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCopyInvite() {
    if (!household!.inviteCode) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/j/${household!.inviteCode}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Could not copy invite link.");
    }
  }

  async function handleCopyCode() {
    if (!household!.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household!.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setActionError("Could not copy code.");
    }
  }

  return (
    <div className="flex flex-col min-h-svh">
      <Header onBack={() => router.back()} />

      <div className="flex flex-col gap-8 p-4 max-w-sm w-full mx-auto">
        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Household name
          </p>
          {editingName ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  autoFocus
                  disabled={nameSaving}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Save household name"
                  disabled={nameSaving}
                  onClick={saveName}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Cancel"
                  disabled={nameSaving}
                  onClick={() => setEditingName(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold leading-tight truncate">
                {household.name}
              </h1>
              {household.isOwner && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Rename household"
                  onClick={startEditingName}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
            </div>
          )}
          {!household.isOwner && (
            <p className="text-xs text-muted-foreground">
              Only the household owner can rename the household.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Members
          </p>
          <ul className="flex flex-col gap-1">
            {household.members.map((member) => {
              const clerkId = clerkUserIdFromToken(member.tokenIdentifier);
              const profile = profiles[clerkId];
              const displayName = member.isMe
                ? `${profile?.name ?? user?.fullName ?? "You"} (you)`
                : profile?.name ?? "Household member";
              return (
                <li
                  key={member.membershipId}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-background/60 transition-colors"
                >
                  <Avatar>
                    <AvatarImage
                      src={member.isMe ? user?.imageUrl : profile?.imageUrl}
                      alt={displayName}
                    />
                    <AvatarFallback>{displayName[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    {member.isOwner && (
                      <span className="text-xs text-muted-foreground">Owner</span>
                    )}
                  </div>
                  {household.isOwner && !member.isOwner && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="ml-auto"
                      disabled={removingId === member.membershipId}
                      onClick={() => handleRemove(member.membershipId, displayName)}
                    >
                      {removingId === member.membershipId ? "Removing…" : "Remove"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Invite
          </p>
          <button
            type="button"
            onClick={handleCopyInvite}
            disabled={!household.inviteCode}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {copied ? "Copied!" : "Copy invite link"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Up to {5 - household.members.length} more{" "}
              {5 - household.members.length === 1 ? "spot" : "spots"} left
            </span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground shrink-0">Or share the code</span>
            <span className="ml-auto font-mono font-semibold tracking-widest text-base">
              {household.inviteCode ?? "…"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!household.inviteCode}
              onClick={handleCopyCode}
            >
              {codeCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </section>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
      <button
        onClick={onBack}
        className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>
      <span className="font-semibold text-base">Household</span>
    </div>
  );
}
