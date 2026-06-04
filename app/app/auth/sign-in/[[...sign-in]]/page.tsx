"use client";

import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  return (
    <div className="grow flex flex-col items-center justify-center gap-4">
      <SignIn fallbackRedirectUrl={redirectUrl ?? "/app"} />
    </div>
  );
}
