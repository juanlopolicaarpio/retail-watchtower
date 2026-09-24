import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoSummary } from "@/lib/demo-data";

export const revalidate = 20;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoSummary);
  try {
    const result = await serverCache("stores:summary", 20_000, async () => {
      const [summary, trend] = await Promise.all([
        db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE sc.is_online = true) as online,
            COUNT(*) FILTER (WHERE sc.is_online = false) as offline,
            COUNT(*) FILTER (WHERE ssh.status = 'BLOCKED') as blocked,
            COUNT(*) FILTER (WHERE ssh.status = 'ERROR') as errors,
            ROUND(
              COUNT(*) FILTER (WHERE sc.is_online = true) * 100.0 / NULLIF(COUNT(*), 0), 1
            ) as online_pct,
            COUNT(*) FILTER (WHERE s.platform = 'grabfood') as grabfood_total,
            COUNT(*) FILTER (WHERE s.platform = 'grabfood' AND sc.is_online = true) as grabfood_online,
            COUNT(*) FILTER (WHERE s.platform = 'foodpanda') as foodpanda_total,
            COUNT(*) FILTER (WHERE s.platform = 'foodpanda' AND sc.is_online = true) as foodpanda_online,
            MAX(sc.checked_at) as last_checked
          FROM stores s
          LEFT JOIN LATERAL (
            SELECT is_online, checked_at
            FROM status_checks
            WHERE store_id = s.id
            ORDER BY checked_at DESC
            LIMIT 1
          ) sc ON true
          LEFT JOIN LATERAL (
            SELECT status
            FROM store_status_hourly
            WHERE store_id = s.id
            ORDER BY effective_at DESC
            LIMIT 1
          ) ssh ON true
        `),
        db.execute(sql`
          SELECT
            DATE_TRUNC('day', effective_at AT TIME ZONE 'Asia/Manila') AS day,
            ROUND(AVG(online * 100.0 / NULLIF(total, 0)), 1) as online_pct,
            ROUND(AVG(online)) as online,
            ROUND(AVG(total)) as total
          FROM status_summary_hourly
          WHERE effective_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('day', effective_at AT TIME ZONE 'Asia/Manila')
          ORDER BY day
        `),
      ]);
      const row = (summary as any[])[0] ?? {};
      return { current: row, trend: trend as any[] };
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
