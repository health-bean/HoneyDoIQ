import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { getUserHomes } from "@/lib/auth/get-user-home";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const homes = await getUserHomes(user.id);

  return NextResponse.json({
    homes: homes.map((h) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      memberRole: h.memberRole,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
    })),
  });
}
