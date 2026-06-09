import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";
import { CheckCircle, Scale, ShoppingCart, LayoutDashboard } from "lucide-react";

const FEATURES = [
  {
    icon: CheckCircle,
    title: "Shared task board",
    description: "Assign chores, set due dates, and track what's done — together.",
  },
  {
    icon: Scale,
    title: "Fairness tracking",
    description: "See who's carrying the load this week, at a glance.",
  },
  {
    icon: ShoppingCart,
    title: "Shopping list",
    description: "One shared list, no more duplicate buys or missed items.",
  },
  {
    icon: LayoutDashboard,
    title: "Household board",
    description: "A clear overview of everything in progress and coming up.",
  },
];

export default function LandingPage() {
  return (
    <>
      <div className="min-h-svh flex flex-col bg-background">
        {/* Nav */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192x192.png" alt="" className="w-7 h-7 rounded-xl" />
            <span className="font-bold text-base">Home Tandem</span>
          </div>
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button variant="ghost" size="sm">Sign in</Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Button asChild size="sm">
              <Link href="/app">Open app</Link>
            </Button>
          </Show>
        </header>

        {/* Hero */}
        <main className="flex flex-col items-center text-center px-6 pt-16 pb-12 gap-8 max-w-lg mx-auto w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/undraw_happy-announcement_23nf.svg"
            alt="Household teamwork"
            className="w-56 h-auto"
          />

          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Run your home,<br />together.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Home Tandem helps households stay on top of chores, shopping, and fairness — no spreadsheets, no arguments.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Show when="signed-out">
              <SignUpButton mode="redirect">
                <Button size="lg" className="w-full">
                  Get started — it&apos;s free
                </Button>
              </SignUpButton>
              <SignInButton mode="redirect">
                <Button variant="outline" size="lg" className="w-full">
                  Sign in
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Button asChild size="lg" className="w-full">
                <Link href="/app">Open app →</Link>
              </Button>
            </Show>
          </div>
        </main>

        {/* Features */}
        <section className="px-6 pb-16 max-w-lg mx-auto w-full">
          <div className="flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 bg-muted/40 rounded-2xl px-4 py-4 border border-border"
              >
                <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* iOS install nudge (non-iOS / already installed → hidden) */}
        <InstallPrompt />
      </div>
    </>
  );
}
