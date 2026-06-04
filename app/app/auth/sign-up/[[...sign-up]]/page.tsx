import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grow flex flex-col items-center justify-center gap-4">
      <SignUp forceRedirectUrl="/app/onboarding" />
    </div>
  );
}
