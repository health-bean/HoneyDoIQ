import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { updateTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";

export const PATCH = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBody(request, updateTaskSchema);
  const now = new Date();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updatedAt: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.frequencyValue !== undefined) updates.frequencyValue = body.frequencyValue;
  if (body.frequencyUnit !== undefined) updates.frequencyUnit = body.frequencyUnit;

  // If frequency changed, recalculate next due date
  if (body.frequencyValue !== undefined || body.frequencyUnit !== undefined) {
    const freqValue = body.frequencyValue ?? task.frequencyValue;
    const freqUnit = (body.frequencyUnit ?? task.frequencyUnit) as FrequencyUnit;
    const lastCompleted = task.lastCompletedDate ? new Date(task.lastCompletedDate) : undefined;
    const nextDue = getNextDueDate(freqValue, freqUnit, lastCompleted);
    updates.nextDueDate = nextDue.toISOString().split("T")[0];
  }

  await db
    .update(taskInstances)
    .set(updates)
    .where(eq(taskInstances.id, parsed.data));

  return NextResponse.json({ success: true });
});
