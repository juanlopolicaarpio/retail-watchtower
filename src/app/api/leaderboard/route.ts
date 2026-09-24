import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoLeaderboard } from "@/lib/demo-data";

export const revalidate = 30;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoLeaderboard);
  try {
    const scores = await serverCache("leaderboard", 30_000, () => db.execute(sql`
      SELECT
        s.id,
        COALESCE(s.name_override, s.name) as display_name,
        s.platform,
        uptime.uptime_pct::float,
        sku.compliance_pct::float,
        csr.current_rating::float,
        ROUND(
          (COALESCE(uptime.uptime_pct, 0) * 0.5 +
           COALESCE(sku.compliance_pct, 0) * 0.5), 1
        )::float as perfect_score
      FROM stores s
      LEFT JOIN (
        SELECT
          store_id,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'ONLINE') * 100.0 / NULLIF(COUNT(*), 0), 1
          ) as uptime_pct
        FROM store_status_hourly
        WHERE effective_at >= NOW() - INTERVAL '7 days'
        GROUP BY store_id
      ) uptime ON s.id = uptime.store_id
      LEFT JOIN LATERAL (
        SELECT compliance_percentage as compliance_pct
        FROM store_sku_checks
        WHERE store_id = s.id
        ORDER BY check_date DESC
        LIMIT 1
      ) sku ON true
      LEFT JOIN current_store_ratings csr ON s.id = csr.store_id
      WHERE uptime.uptime_pct IS NOT NULL OR sku.compliance_pct IS NOT NULL
      ORDER BY perfect_score DESC
    `));

    return NextResponse.json(scores as any[]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
