import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoStores } from "@/lib/demo-data";

export const revalidate = 20;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoStores);
  try {
    const latest = await serverCache("stores:status", 20_000, () => db.execute(sql`
      SELECT
        s.id,
        COALESCE(s.name_override, s.name) as display_name,
        s.name,
        s.url,
        s.platform,
        sc.is_online,
        sc.checked_at,
        sc.response_time_ms,
        ssh.status,
        ssh.confidence
      FROM stores s
      LEFT JOIN LATERAL (
        SELECT is_online, checked_at, response_time_ms
        FROM status_checks
        WHERE store_id = s.id
        ORDER BY checked_at DESC
        LIMIT 1
      ) sc ON true
      LEFT JOIN LATERAL (
        SELECT status, confidence
        FROM store_status_hourly
        WHERE store_id = s.id
        ORDER BY effective_at DESC
        LIMIT 1
      ) ssh ON true
      ORDER BY s.platform, s.name
    `));

    return NextResponse.json(latest as any[]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
