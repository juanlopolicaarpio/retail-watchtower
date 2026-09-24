import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoRatings } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "All";
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    const rows = demoRatings
      .filter((row) => platform === "All" || row.platform === platform.toLowerCase())
      .flatMap((row) => row.history.map((point, index) => ({
        Store: row.display_name,
        Platform: row.platform === "grabfood" ? "GrabFood" : "Foodpanda",
        Rating: point.rating,
        Previous: index ? row.history[index - 1].rating : "",
        Change: index ? Number((point.rating - row.history[index - 1].rating).toFixed(2)) : "",
        Scraped: point.scraped_at,
      })));
    return NextResponse.json(rows);
  }

  try {
    const rows = await db.execute(sql`
      SELECT
        COALESCE(s.name_override, s.name) AS store,
        s.platform,
        sr.rating,
        LAG(sr.rating) OVER (PARTITION BY sr.store_id ORDER BY sr.scraped_at) AS previous_rating,
        sr.scraped_at AT TIME ZONE 'Asia/Manila' AS scraped
      FROM store_ratings sr
      JOIN stores s ON s.id = sr.store_id
      WHERE sr.scraped_at >= NOW() - (${days} || ' days')::interval
        ${platform !== "All" ? sql`AND s.platform = ${platform.toLowerCase()}` : sql``}
      ORDER BY sr.scraped_at DESC, store
    `);

    const result = (rows as any[]).map((r) => {
      const curr = parseFloat(r.rating);
      const prev = r.previous_rating != null ? parseFloat(r.previous_rating) : null;
      const change = prev != null ? curr - prev : null;
      return {
        Store: r.store,
        Platform: r.platform === "grabfood" ? "GrabFood" : "Foodpanda",
        Rating: curr,
        Previous: prev ?? "",
        Change: change != null ? (change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1)) : "",
        Scraped: new Date(r.scraped).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }),
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
