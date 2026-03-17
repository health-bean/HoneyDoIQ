import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeInvites, homeMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Send an invite
export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const home = await getUserHome(user.id);
  if (!home || home.memberRole !== "owner") {
    return NextResponse.json({ error: "Only the home owner can invite members" }, { status: 403 });
  }

  const body = await request.json();
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if already a member
  const existingMembers = await db
    .select({ email: users.email })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id));

  if (existingMembers.some((m) => m.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "This person is already a member" }, { status: 400 });
  }

  // Check if invite already pending
  const [existingInvite] = await db
    .select()
    .from(homeInvites)
    .where(
      and(
        eq(homeInvites.homeId, home.id),
        eq(homeInvites.invitedEmail, email),
        eq(homeInvites.status, "pending")
      )
    );

  if (existingInvite) {
    return NextResponse.json({ error: "Invite already sent to this email" }, { status: 400 });
  }

  // Check if the invited user already exists (signed up before)
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser) {
    // Auto-accept: add them as a member directly
    await db.insert(homeMembers).values({
      homeId: home.id,
      userId: existingUser.id,
      role: "member",
      invitedBy: user.id,
    });

    return NextResponse.json({ success: true, autoAccepted: true });
  }

  // Create a pending invite for when they sign up
  await db.insert(homeInvites).values({
    homeId: home.id,
    invitedEmail: email,
    invitedBy: user.id,
  });

  return NextResponse.json({ success: true, autoAccepted: false });
}

// Get pending invites and current members
export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const home = await getUserHome(user.id);
  if (!home) {
    return NextResponse.json({ members: [], invites: [] });
  }

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id));

  const invites = await db
    .select()
    .from(homeInvites)
    .where(
      and(
        eq(homeInvites.homeId, home.id),
        eq(homeInvites.status, "pending")
      )
    );

  return NextResponse.json({ members, invites });
}
