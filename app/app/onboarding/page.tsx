"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { completeOnboarding } from "./_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Copy, Link2, LogIn, PlusCircle, Users } from "lucide-react";

type Step = "name" | "choice" | "join" | "invite";

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const myHousehold = useQuery(api.households.getMyHousehold);
  const createHousehold = useMutation(api.households.create);
  const joinHousehold = useMutation(api.households.joinByCode);

  // Returning users (e.g. someone who already picked a display name but was
  // later removed from their household) shouldn't have to redo the name
  // step — show them "create or join a household" right away. This is a
  // pure derivation (not stored state), so once they move past it via their
  // own actions `step` takes back over.
  const isReturningWithoutHousehold =
    Boolean(user?.publicMetadata?.onboardingComplete) && myHousehold === null;
  const effectiveStep: Step =
    step === "name" && isReturningWithoutHousehold ? "choice" : step;

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await completeOnboarding(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      // Check Convex household state before reloading Clerk — Convex is
      // independent of the JWT refresh and already reflects any household
      // joined via invite link prior to onboarding.
      if (myHousehold) {
        await user?.reload();
        window.location.href = "/app";
      } else {
        await user?.reload();
        setStep("choice");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateHousehold() {
    setError(null);
    setPending(true);
    try {
      const code = await createHousehold();
      setInviteCode(code);
      setStep("invite");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleJoinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) {
      setError("Enter an invite code");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await joinHousehold({ code });
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof ConvexError ? String(err.data) : "Invalid or expired invite code");
    } finally {
      setPending(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/j/${inviteCode}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  async function handleCopyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError("Could not copy code.");
    }
  }

  if (effectiveStep === "name") {
    return (
      <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Step 1 · Get started
          </p>
          <h1 className="text-3xl font-extrabold leading-tight">
            What should we call you?
          </h1>
        </div>

        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Jane Smith"
              required
              defaultValue={user?.fullName ?? ""}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            disabled={pending || myHousehold === undefined}
          >
            {pending ? "Setting up…" : "Get started →"}
          </Button>
        </form>
      </div>
    );
  }

  if (effectiveStep === "choice") {
    return (
      <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Step 2 · Household
          </p>
          <h1 className="text-3xl font-extrabold leading-tight">
            Create or join a household?
          </h1>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={handleCreateHousehold}
            className="flex items-start gap-3 rounded-2xl border border-border px-4 py-4 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <PlusCircle className="mt-0.5 shrink-0 size-5 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm">Create a household</span>
              <span className="text-xs text-muted-foreground">
                Start fresh and invite the people you live with.
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setStep("join");
            }}
            className="flex items-start gap-3 rounded-2xl border border-border px-4 py-4 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <LogIn className="mt-0.5 shrink-0 size-5 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm">Join a household</span>
              <span className="text-xs text-muted-foreground">
                Already have an invite code? Use it to join.
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (effectiveStep === "join") {
    return (
      <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Step 2 · Join
          </p>
          <h1 className="text-3xl font-extrabold leading-tight">
            Enter your invite code
          </h1>
        </div>

        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={6}
              value={joinCode}
              onChange={(v) => setJoinCode(v.toLowerCase())}
              inputMode="text"
              autoFocus
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="size-12 text-lg font-bold uppercase" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">Enter the 6-character code from your invite</p>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="flex-1"
              disabled={pending}
              onClick={() => {
                setError(null);
                setStep("choice");
              }}
            >
              ← Back
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={pending}>
              {pending ? "Joining…" : "Join →"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // step === "invite"
  return (
    <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Step 2 · Invite
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">
          Invite the people
          <br />
          you live with
        </h1>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-primary/8 px-4 py-3 text-sm text-primary">
        <Users className="mt-0.5 shrink-0 size-4" />
        <span>
          Share this link with your housemates (up to 4 others). Each person
          will be added to your household when they sign up.
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Code display */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-4 py-5">
          <p className="text-xs text-muted-foreground">Share this code with your housemates</p>
          <div className="pointer-events-none">
          <InputOTP maxLength={6} value={(inviteCode ?? "").toUpperCase()} readOnly inputMode="none" tabIndex={-1}>
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
              disabled={!inviteCode}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <Copy className="size-3.5" />
              {codeCopied ? "Copied!" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!inviteCode}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <Link2 className="size-3.5" />
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={() => {
              window.location.href = "/app";
            }}
          >
            Skip for now
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={!copied && !codeCopied}
            onClick={() => {
              window.location.href = "/app";
            }}
          >
            Go to board →
          </Button>
        </div>
      </div>
    </div>
  );
}
