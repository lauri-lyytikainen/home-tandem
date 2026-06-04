"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { onboardingComplete: true, name: name.trim() },
  });

  return { success: true };
}

export async function sendClerkInvitation(email: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl}/app/auth/sign-up`,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send invite";
    return { error: message };
  }
}
