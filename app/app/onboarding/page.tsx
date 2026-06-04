"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { completeOnboarding, sendClerkInvitation } from "./_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Users } from "lucide-react";

type Step = "name" | "invite" | "waiting";

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const getOrCreateInviteCode = useMutation(api.invites.getOrCreate);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await completeOnboarding(formData);
      if (result.error) { setError(result.error); return; }
      await user?.reload();
      setStep("invite");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopyLink() {
    setPending(true);
    try {
      const code = inviteCode ?? (await getOrCreateInviteCode());
      setInviteCode(code);
      const appUrl = window.location.origin;
      await navigator.clipboard.writeText(`${appUrl}/j/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    } finally {
      setPending(false);
    }
  }

  async function handleSendInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const code = inviteCode ?? (await getOrCreateInviteCode());
      setInviteCode(code);
      const result = await sendClerkInvitation(inviteEmail);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("waiting");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
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
            disabled={pending}
          >
            {pending ? "Setting up…" : "Get started →"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "invite") {
    const shortLink = inviteCode
      ? `${window.location.host}/j/${inviteCode}`
      : `${window.location.host}/j/…`;

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
          <span>Home Tandem works with exactly two people.</span>
        </div>

        <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Their email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="roommate@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            disabled={pending}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {copied ? "Copied!" : "Copy invite link"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground truncate max-w-35">
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
              type="submit"
              size="lg"
              className="flex-1"
              disabled={pending || !inviteEmail}
            >
              {pending ? "Sending…" : "Send invite →"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // step === "waiting"
  return (
    <div className="grow flex flex-col max-w-sm mx-auto w-full pt-16 gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Step 3 · Almost there
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">
          Waiting for your housemate
        </h1>
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">
        We&apos;ve emailed an invite. The moment they join, you&apos;ll share
        one board, one shopping list, one honest picture of the load.
      </p>

      <div className="flex items-center justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="size-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {(
              user?.firstName?.[0] ??
              user?.emailAddresses?.[0]?.emailAddress?.[0] ??
              "Y"
            ).toUpperCase()}
          </div>
          <span className="text-sm font-medium">
            {user?.firstName ?? "You"}
          </span>
          <span className="text-xs font-semibold text-green-600">joined</span>
        </div>

        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <div className="text-2xl">🏠</div>
          <span className="text-xs">{/* household name placeholder */}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="size-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
            <Users className="size-6" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {inviteEmail ? inviteEmail.split("@")[0] : "Housemate"}
          </span>
          <span className="text-xs font-semibold text-amber-600">pending</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4 pb-8">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            window.location.href = "/app";
          }}
        >
          Explore the board while you wait
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Closed household · two people · equal ownership
        </p>
      </div>
    </div>
  );
}
