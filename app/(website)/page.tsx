import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import {
  CheckCircle,
  Scale,
  ShoppingCart,
  LayoutDashboard,
  Github,
} from "lucide-react";

const FEATURES = [
  {
    icon: CheckCircle,
    title: "Shared task board",
    description:
      "Assign chores, set due dates, and track what's done — together.",
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
    <div className="min-h-svh flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192x192.png"
              alt=""
              className="w-8 h-8 rounded-xl shadow-sm"
            />
            <span className="font-extrabold text-base tracking-tight">
              Home Tandem
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <Button size="sm">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button asChild size="sm">
                <Link href="/app">Open app</Link>
              </Button>
            </Show>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center text-center px-6 pt-20 pb-12 gap-10 max-w-5xl mx-auto w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/undraw_happy-announcement_23nf.svg"
          alt="Household teamwork"
          className="w-52 h-auto"
        />

        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Run your home,
            <br />
            together.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            Home Tandem helps households stay on top of chores, shopping, and
            fairness — no spreadsheets, no arguments.
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
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-5">
          Everything your household needs
        </p>
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
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192x192.png"
              alt=""
              className="w-6 h-6 rounded-lg"
            />
            <span className="font-bold text-sm">Home Tandem</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            A simple app for households who want to stay in sync.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Show when="signed-out">
              <SignUpButton mode="redirect">
                <button className="hover:text-foreground transition-colors">
                  Sign up
                </button>
              </SignUpButton>
              <SignInButton mode="redirect">
                <button className="hover:text-foreground transition-colors">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/app"
                className="hover:text-foreground transition-colors"
              >
                Open app
              </Link>
            </Show>
          </div>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Home Tandem
          </p>
        </div>
      </footer>

      {/* iOS install nudge */}
      <InstallPrompt />
    </div>
  );
}
