"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };
  if (name.trim().length > 100) return { error: "Name must be 100 characters or fewer" };

  const client = await clerkClient();
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || undefined;
  await client.users.updateUser(userId, {
    firstName,
    lastName,
    publicMetadata: { onboardingComplete: true },
  });

  return { success: true };
}
