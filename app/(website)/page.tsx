import Link from "next/link";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Home Tandem</h1>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="/app">Open app</Link>
        </Button>
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <Button variant="outline">Sign in</Button>
          </SignInButton>
        </Show>
      </div>
    </div>
  );
}
