"use client";

import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  return (
    <div className="grow flex flex-col items-center justify-center gap-4">
      <SignUp fallbackRedirectUrl={redirectUrl ?? "/app/onboarding"} />
    </div>
  );
}
