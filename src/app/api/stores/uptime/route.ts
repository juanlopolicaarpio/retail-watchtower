import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoUptime } from "@/lib/demo-data";

export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  if (!process.env.DATABASE_URL) return NextResponse.json(demoUptime);

  try {
    const uptime = await serverCache(`stores:uptime:${days}`, 60_000, () => db.execute(sql`
      SELECT
        s.id,
        COALESCE(s.name_override, s.name) as display_name,
        s.platform,
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE ssh.status = 'ONLINE') as online_checks,
        ROUND(
          COUNT(*) FILTER (WHERE ssh.status = 'ONLINE') * 100.0 / NULLIF(COUNT(*), 0), 1
        ) as uptime_pct
      FROM stores s
      JOIN store_status_hourly ssh ON s.id = ssh.store_id
      WHERE ssh.effective_at >= NOW() - (${days} || ' days')::INTERVAL
      GROUP BY s.id, s.name, s.name_override, s.platform
      ORDER BY uptime_pct DESC
    `));

    return NextResponse.json(uptime as any[]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
