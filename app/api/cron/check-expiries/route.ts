import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

// Sends are spaced out to respect Resend's rate limit, so allow a longer run.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runReminders());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder run failed" },
      { status: 500 }
    );
  }
}
