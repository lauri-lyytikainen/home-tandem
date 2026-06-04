import { Button } from "@/components/ui/button";
import Image from "next/image";
import undrawHappy from "@/public/illustrations/undraw_happy-announcement_23nf.svg";
import logo from "@/public/logo.svg";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Welcome() {
  return (
    <div className="grow flex flex-col min-h-0 bg-gradient-to-b from-primary/5 to-background">
      <div className="flex flex-col items-center text-center px-6 pt-16 pb-8 gap-3">
        <Image src={logo} alt="Home Tandem" className="size-14" priority />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Home Tandem</h1>
          <p className="text-muted-foreground text-base leading-snug max-w-[260px]">
            One board. One list. Two people who actually share the load.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 min-h-0">
        <Image
          priority
          src={undrawHappy}
          alt="Two people sharing household tasks"
          className="w-full max-w-xs drop-shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-4 px-6 pb-10">
        <div className="flex gap-2 justify-center flex-wrap">
          {["Shared to-dos", "Shopping list", "Fair split"].map((label) => (
            <span
              key={label}
              className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <SignUpButton>
            <Button size="lg" className="w-full h-13 text-base font-semibold shadow-sm">
              Get started free
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button variant="ghost" size="lg" className="w-full h-13 text-base">
              I already have an account
            </Button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
