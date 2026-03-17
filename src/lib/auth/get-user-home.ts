import { db } from "@/lib/db";
import { homes, homeMembers } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * Get the first home the user has access to — either as owner or member.
 */
export async function getUserHome(userId: string) {
  // Check membership first (includes owners)
  const [membership] = await db
    .select({ homeId: homeMembers.homeId, role: homeMembers.role })
    .from(homeMembers)
    .where(eq(homeMembers.userId, userId))
    .limit(1);

  if (membership) {
    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, membership.homeId));
    return home ? { ...home, memberRole: membership.role } : null;
  }

  // Fallback: check legacy ownership (for users who onboarded before home_members existed)
  const [home] = await db
    .select()
    .from(homes)
    .where(eq(homes.userId, userId))
    .limit(1);

  if (home) {
    // Backfill: create a membership record for the owner
    await db.insert(homeMembers).values({
      homeId: home.id,
      userId,
      role: "owner",
    });
    return { ...home, memberRole: "owner" as const };
  }

  return null;
}
