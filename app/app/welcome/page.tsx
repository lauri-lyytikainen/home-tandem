import { Button } from "@/components/ui/button";
import Image from "next/image";
import undrawHappy from "@/public/illustrations/undraw_happy-announcement_23nf.svg";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Welcome() {
  return (
    <div className="grow flex flex-col items-center justify-between gap-4">
      <h1 className="text-2xl font-extrabold">Welcome to Home Tandem</h1>
      <Image
        priority
        src={undrawHappy}
        alt="Happy Announcement"
        className="w-2/3 max-w-sm"
      />
      <div className="flex w-full gap-2">
        <SignInButton>
          <Button variant="default" size={"lg"} className="grow h-13">
            Log In
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button variant="outline" size={"lg"} className="grow h-13">
            Sign Up
          </Button>
        </SignUpButton>
      </div>
    </div>
  );
}
