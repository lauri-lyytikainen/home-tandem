"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { completeOnboarding } from "./_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Users } from "lucide-react";

type Step = "name" | "invite";

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const myHousehold = useQuery(api.households.getMyHousehold);
  const createHousehold = useMutation(api.households.create);

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
        const code = await createHousehold();
        await user?.reload();
        setInviteCode(code);
        setStep("invite");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
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

  if (step === "name") {
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

  // step === "invite"
  const shortLink = inviteCode
    ? `${window.location.host}/j/${inviteCode}`
    : "…";

  return (
    <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Step 2 · Invite
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">
          Invite the person
          <br />
          you live with
        </h1>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-primary/8 px-4 py-3 text-sm text-primary">
        <Users className="mt-0.5 shrink-0 size-4" />
        <span>
          Share this link with your housemate. They&apos;ll be added to your
          household when they sign up.
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={!inviteCode}
          className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">
            {copied ? "Copied!" : "Copy invite link"}
          </span>
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-40">
            {shortLink}
          </span>
        </button>

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
            disabled={!copied}
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
