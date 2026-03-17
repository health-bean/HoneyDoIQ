import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { calculateHomeHealthScore } from "@/lib/tasks/scheduling";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const home = await getUserHome(user.id);

  if (!home) {
    return NextResponse.json({ home: null, tasks: [], score: null });
  }

  // Get all active task instances for this home
  const tasks = await db
    .select()
    .from(taskInstances)
    .where(and(eq(taskInstances.homeId, home.id), eq(taskInstances.isActive, true)))
    .orderBy(asc(taskInstances.nextDueDate));

  // Calculate upkeep score
  const score = calculateHomeHealthScore(
    tasks.map((t) => ({
      nextDueDate: new Date(t.nextDueDate),
      priority: t.priority,
      lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
      isActive: t.isActive ?? true,
    }))
  );

  // Split tasks into overdue and upcoming
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const overdueTasks = tasks.filter((t) => t.nextDueDate < today);
  const upcomingTasks = tasks.filter(
    (t) => t.nextDueDate >= today && t.nextDueDate <= weekFromNow
  );

  // Get household members
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id));

  return NextResponse.json({
    home: {
      id: home.id,
      name: home.name,
      type: home.type,
    },
    score,
    overdue: overdueTasks.slice(0, 10),
    upcoming: upcomingTasks.slice(0, 10),
    totalActive: tasks.length,
    userName: user.name,
    members,
    memberRole: home.memberRole,
  });
}
