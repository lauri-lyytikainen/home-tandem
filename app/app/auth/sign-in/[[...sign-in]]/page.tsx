import { SignIn } from "@clerk/nextjs";
export default function SignInPage() {
  return (
    <div className="grow flex flex-col items-center justify-center gap-4">
      <SignIn forceRedirectUrl="/app" />
    </div>
  );
}
