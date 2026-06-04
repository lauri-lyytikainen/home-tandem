import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!code) redirect("/app/auth/sign-up");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 max-w-sm mx-auto text-center">
      <div className="text-4xl">🏠</div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold">You&apos;ve been invited to Home Tandem</h1>
        <p className="text-muted-foreground text-sm">
          Create your account to share one board, one shopping list, one honest
          picture of the load.
        </p>
      </div>
      <Button asChild size="lg" className="w-full">
        <Link href={`/app/auth/sign-up`}>Accept invite &amp; sign up</Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/app/auth/sign-in" className="underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
