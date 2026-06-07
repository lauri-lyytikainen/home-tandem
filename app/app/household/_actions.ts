"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export type MemberProfile = {
  id: string;
  name: string;
  imageUrl: string;
};

// Resolves Clerk profile info (name, avatar) for a set of Clerk user ids.
// Convex only stores the stable token identifier for each member, so the
// human-readable profile has to be looked up from the auth provider.
const MAX_HOUSEHOLD_MEMBERS = 5;

export async function getMemberProfiles(clerkUserIds: string[]) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" } as const;
  if (clerkUserIds.length === 0) return { profiles: [] as MemberProfile[] };

  // Cap input to the household member limit so callers can't enumerate
  // arbitrary Clerk user IDs in bulk.
  const safeIds = clerkUserIds.slice(0, MAX_HOUSEHOLD_MEMBERS);

  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    userId: safeIds,
    limit: MAX_HOUSEHOLD_MEMBERS,
  });

  const profiles: MemberProfile[] = data.map((user) => ({
    id: user.id,
    name:
      user.fullName?.trim() ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      "Household member",
    imageUrl: user.imageUrl,
  }));

  return { profiles };
}
