"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getMemberProfiles, type MemberProfile } from "./_actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  Link2,
  LogOut,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";


function useCountdown(expiresAt: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return expiresAt ? remaining : null;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function HouseholdPage() {
  const router = useRouter();
  const { user } = useUser();

  const household = useQuery(api.households.getHousehold);
  const renameHousehold = useMutation(api.households.rename);
  const removeMember = useMutation(api.households.removeMember);
  const generateInvite = useMutation(api.households.generateInvite);
  const leaveHousehold = useMutation(api.households.leave);

  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [localInvite, setLocalInvite] = useState<{
    code: string;
    expiresAt: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Use the invite from Convex if we don't have a fresher local one
  const activeInvite: { code: string; expiresAt: number } | null =
    localInvite ??
    (household?.inviteCode && household.inviteExpiresAt
      ? { code: household.inviteCode, expiresAt: household.inviteExpiresAt }
      : null);

  const inviteRemaining = useCountdown(activeInvite?.expiresAt ?? null);
  const inviteExpired = inviteRemaining !== null && inviteRemaining === 0;

  useEffect(() => {
    if (inviteExpired && localInvite) {
      const id = setTimeout(() => setLocalInvite(null), 0);
      return () => clearTimeout(id);
    }
  }, [inviteExpired, localInvite]);

  useEffect(() => {
    if (!household) return;
    const ids = household.members.map((m) => m.clerkUserId);
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
      setNameError(
        err instanceof ConvexError
          ? String(err.data)
          : "Could not rename household",
      );
    } finally {
      setNameSaving(false);
    }
  }

  async function handleRemove(
    membershipId: Id<"householdMemberships">,
    memberName: string,
  ) {
    if (!window.confirm(`Remove ${memberName} from the household?`)) return;
    setActionError(null);
    setRemovingId(membershipId);
    try {
      await removeMember({ membershipId });
    } catch (err) {
      setActionError(
        err instanceof ConvexError
          ? String(err.data)
          : "Could not remove member",
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function handleGenerateInvite() {
    setActionError(null);
    setGeneratingInvite(true);
    setCopied(false);
    setCodeCopied(false);
    try {
      const result = await generateInvite();
      setLocalInvite(result);
    } catch (err) {
      setActionError(
        err instanceof ConvexError
          ? String(err.data)
          : "Could not generate invite",
      );
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!activeInvite) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/j/${activeInvite.code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Could not copy invite link.");
    }
  }

  async function handleCopyCode() {
    if (!activeInvite) return;
    try {
      await navigator.clipboard.writeText(activeInvite.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setActionError("Could not copy code.");
    }
  }

  async function handleLeave() {
    const isOwner = household!.isOwner;
    const hasOthers = household!.members.length > 1;
    const message =
      isOwner && !hasOthers
        ? "Leave and delete this household? This cannot be undone."
        : "Leave this household?";
    if (!window.confirm(message)) return;
    setActionError(null);
    setLeaving(true);
    try {
      await leaveHousehold();
      window.location.href = "/app/onboarding";
    } catch (err) {
      setActionError(
        err instanceof ConvexError
          ? String(err.data)
          : "Could not leave household",
      );
      setLeaving(false);
    }
  }

  const canLeave = !household.isOwner || household.members.length === 1;

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
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
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
              const profile = profiles[member.clerkUserId];
              const displayName = member.isMe
                ? `${profile?.name ?? user?.fullName ?? "You"} (you)`
                : (profile?.name ?? "Household member");
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
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                    {member.isOwner && (
                      <span className="text-xs text-muted-foreground">
                        Owner
                      </span>
                    )}
                  </div>
                  {household.isOwner && !member.isOwner && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="ml-auto"
                      disabled={removingId === member.membershipId}
                      onClick={() =>
                        handleRemove(member.membershipId, displayName)
                      }
                    >
                      {removingId === member.membershipId
                        ? "Removing…"
                        : "Remove"}
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

          {activeInvite && inviteRemaining !== null && inviteRemaining > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Expires in {formatCountdown(inviteRemaining)}</span>
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  disabled={generatingInvite}
                  onClick={handleGenerateInvite}
                >
                  <RefreshCw className="size-3" />
                  New invite
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {copied ? "Copied!" : "Copy invite link"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {5 - household.members.length} spot
                  {5 - household.members.length === 1 ? "" : "s"} left
                </span>
              </button>
              <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground shrink-0">
                  Or share the code
                </span>
                <span className="ml-auto font-mono font-semibold tracking-widest text-base">
                  {activeInvite.code}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                >
                  {codeCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={generatingInvite || household.members.length >= 5}
              onClick={handleGenerateInvite}
            >
              {generatingInvite ? "Generating…" : "Generate invite link"}
            </Button>
          )}
          {household.members.length >= 5 && (
            <p className="text-xs text-muted-foreground">
              Household is full (5/5 members).
            </p>
          )}
        </section>

        {actionError && (
          <p className="text-sm text-destructive">{actionError}</p>
        )}

        <section className="flex flex-col gap-2 pt-2 border-t border-border">
          <Button
            variant="destructive"
            className="w-full"
            disabled={leaving || !canLeave}
            onClick={handleLeave}
          >
            <LogOut className="size-4" />
            {leaving ? "Leaving…" : "Leave household"}
          </Button>
          {!canLeave && (
            <p className="text-xs text-muted-foreground text-center">
              Remove all other members before leaving as the owner.
            </p>
          )}
        </section>
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
