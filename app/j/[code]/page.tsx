"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const joinHousehold = useMutation(api.households.joinByCode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    joinHousehold({ code })
      .then(() => router.replace("/app"))
      .catch((err: Error) => setError(err.message ?? "Invalid or expired invite link"));
  }, [isLoaded, isSignedIn, code, joinHousehold, router]);

  if (!isLoaded || (isSignedIn && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Joining household…
      </div>
    );
  }

  const returnPath = encodeURIComponent(`/j/${code}`);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 max-w-sm mx-auto text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold">
          You&apos;ve been invited to Home Tandem
        </h1>
        <p className="text-muted-foreground text-sm">
          Create your account to share a board, shopping list, and a fair
          picture of who does what at home.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-3 w-full">
        <Button asChild size="lg" className="w-full">
          <Link href={`/app/auth/sign-up?redirect_url=${returnPath}`}>
            Accept invite &amp; sign up
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/app/auth/sign-in?redirect_url=${returnPath}`}
            className="underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
