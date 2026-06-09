"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getMemberProfiles, type MemberProfile } from "./_actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  LogOut,
  Moon,
  Pencil,
  RefreshCw,
  Sun,
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

function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-background border border-border">
      <div className="flex items-center gap-3">
        {mounted && isDark ? (
          <Moon className="size-5 text-muted-foreground" />
        ) : (
          <Sun className="size-5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">Dark mode</span>
      </div>
      <button
        role="switch"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          mounted && isDark ? "bg-foreground" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            mounted && isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
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
    return () => { cancelled = true; };
  }, [household]);

  function startEditingName() {
    setNameDraft(household!.name);
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (!name) { setNameError("Household name cannot be empty"); return; }
    setNameSaving(true);
    setNameError(null);
    try {
      await renameHousehold({ name });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof ConvexError ? String(err.data) : "Could not rename household");
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
      setActionError(err instanceof ConvexError ? String(err.data) : "Could not remove member");
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
      setActionError(err instanceof ConvexError ? String(err.data) : "Could not generate invite");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!activeInvite) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/j/${activeInvite.code}`);
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
      setActionError(err instanceof ConvexError ? String(err.data) : "Could not leave household");
      setLeaving(false);
    }
  }

  const canLeave = !household?.isOwner || household.members.length === 1;

  return (
    <div className="flex flex-col min-h-svh">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="font-semibold text-base">Settings</span>
      </div>

      <div className="flex flex-col gap-8 p-4 max-w-sm w-full mx-auto">

        {/* Appearance */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Appearance
          </p>
          <DarkModeToggle />
        </section>

        {/* Household name */}
        {household && (
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
                  <Button size="icon-sm" variant="ghost" aria-label="Save" disabled={nameSaving} onClick={saveName}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Cancel" disabled={nameSaving} onClick={() => setEditingName(false)}>
                    <X className="size-4" />
                  </Button>
                </div>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold leading-tight truncate">{household.name}</h2>
                {household.isOwner && (
                  <Button size="icon-sm" variant="ghost" aria-label="Rename household" onClick={startEditingName}>
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
            )}
            {!household.isOwner && (
              <p className="text-xs text-muted-foreground">Only the household owner can rename the household.</p>
            )}
          </section>
        )}

        {/* Members */}
        {household && (
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
                  <li key={member.membershipId} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-background/60 transition-colors">
                    <Avatar>
                      <AvatarImage src={member.isMe ? user?.imageUrl : profile?.imageUrl} alt={displayName} />
                      <AvatarFallback>{displayName[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{displayName}</span>
                      {member.isOwner && <span className="text-xs text-muted-foreground">Owner</span>}
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
        )}

        {/* Invite */}
        {household && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Invite
            </p>
            {household.members.length >= 5 ? (
              <p className="text-xs text-muted-foreground">Household is full (5/5 members).</p>
            ) : activeInvite && inviteRemaining !== null && inviteRemaining > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Code display */}
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-4 py-5">
                  <p className="text-xs text-muted-foreground">Share this code to invite someone</p>
                  <div className="pointer-events-none">
                  <InputOTP maxLength={6} value={activeInvite.code.toUpperCase()} readOnly inputMode="none" tabIndex={-1}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} className="size-11 text-lg font-bold uppercase" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <Copy className="size-3.5" />
                      {codeCopied ? "Copied!" : "Copy code"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyInvite}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <Link2 className="size-3.5" />
                      {copied ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground px-1">
                    <span>Expires in {formatCountdown(inviteRemaining)}</span>
                    <span>{5 - household.members.length} spot{5 - household.members.length === 1 ? "" : "s"} left</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  disabled={generatingInvite}
                  onClick={handleGenerateInvite}
                >
                  <RefreshCw className="size-3" />
                  Generate new invite
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={generatingInvite}
                onClick={handleGenerateInvite}
              >
                {generatingInvite ? "Generating…" : "Generate invite link"}
              </Button>
            )}
          </section>
        )}

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        {/* Leave */}
        {household && (
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
        )}
      </div>
    </div>
  );
}
