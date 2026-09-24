import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoRatings } from "@/lib/demo-data";

export const revalidate = 60;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoRatings);
  try {
    const ratings = await serverCache("ratings", 60_000, () => db.execute(sql`
      WITH history AS (
        SELECT
          store_id,
          json_agg(json_build_object('rating', rating, 'scraped_at', scraped_at) ORDER BY scraped_at) as history_json
        FROM store_ratings
        WHERE scraped_at >= NOW() - INTERVAL '30 days'
        GROUP BY store_id
      )
      SELECT
        s.id,
        COALESCE(s.name_override, s.name) as display_name,
        s.platform,
        csr.current_rating::float,
        csr.last_scraped_at,
        csr.rating_trend,
        csr.trend_value::float,
        h.history_json as history
      FROM stores s
      JOIN current_store_ratings csr ON s.id = csr.store_id
      LEFT JOIN history h ON s.id = h.store_id
      ORDER BY csr.current_rating DESC
    `));

    return NextResponse.json(ratings as any[]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
