import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoRatings } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "All";
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(demoRatings
      .filter((row) => platform === "All" || row.platform === platform.toLowerCase())
      .map((row) => ({
        Store: row.display_name,
        Platform: row.platform === "grabfood" ? "GrabFood" : "Foodpanda",
        First: row.history[0].rating,
        First_Date: row.history[0].scraped_at,
        Latest: row.current_rating,
        Latest_Date: row.last_scraped_at,
        High: Math.max(...row.history.map((point) => point.rating)),
        Low: Math.min(...row.history.map((point) => point.rating)),
        Net_Change: row.trend_value,
        Scrapes: row.history.length,
      })));
  }

  try {
    const rows = await db.execute(sql`
      SELECT
        COALESCE(s.name_override, s.name) AS store,
        s.platform,
        FIRST_VALUE(sr.rating) OVER w AS first_rating,
        FIRST_VALUE(sr.scraped_at AT TIME ZONE 'Asia/Manila') OVER w AS first_date,
        LAST_VALUE(sr.rating) OVER w AS latest_rating,
        LAST_VALUE(sr.scraped_at AT TIME ZONE 'Asia/Manila') OVER w AS latest_date,
        MAX(sr.rating) OVER (PARTITION BY sr.store_id) AS high,
        MIN(sr.rating) OVER (PARTITION BY sr.store_id) AS low,
        COUNT(*) OVER (PARTITION BY sr.store_id) AS scrapes
      FROM store_ratings sr
      JOIN stores s ON s.id = sr.store_id
      WHERE sr.scraped_at >= NOW() - (${days} || ' days')::interval
        ${platform !== "All" ? sql`AND s.platform = ${platform.toLowerCase()}` : sql``}
      WINDOW w AS (PARTITION BY sr.store_id ORDER BY sr.scraped_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    `);

    // Deduplicate — one row per store
    const seen = new Set<string>();
    const result: any[] = [];
    for (const r of rows as any[]) {
      const key = `${r.store}||${r.platform}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const first = parseFloat(r.first_rating);
      const latest = parseFloat(r.latest_rating);
      const change = latest - first;
      result.push({
        Store: r.store,
        Platform: r.platform === "grabfood" ? "GrabFood" : "Foodpanda",
        First: first,
        First_Date: new Date(r.first_date).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" }),
        Latest: latest,
        Latest_Date: new Date(r.latest_date).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" }),
        High: parseFloat(r.high),
        Low: parseFloat(r.low),
        Net_Change: change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1),
        Scrapes: parseInt(r.scrapes),
      });
    }
    result.sort((a, b) => b.Latest - a.Latest);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
