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
