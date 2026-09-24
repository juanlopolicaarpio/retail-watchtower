import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoRatings } from "@/lib/demo-data";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(demoRatings.map((row, index) => ({
      Rank: index + 1,
      Store: row.display_name,
      Platform: row.platform === "grabfood" ? "GrabFood" : "Foodpanda",
      Rating: row.current_rating,
      Last_Scraped: row.last_scraped_at,
    })));
  }
  try {
    const rows = await db.execute(sql`
      SELECT
        ROW_NUMBER() OVER (ORDER BY csr.rating DESC) AS rank,
        COALESCE(s.name_override, s.name) AS store,
        s.platform,
        csr.rating,
        csr.scraped_at AT TIME ZONE 'Asia/Manila' AS last_scraped
      FROM current_store_ratings csr
      JOIN stores s ON s.id = csr.store_id
      ORDER BY csr.rating DESC
    `);

    const result = (rows as any[]).map((r) => ({
      Rank: parseInt(r.rank),
      Store: r.store,
      Platform: r.platform === "grabfood" ? "GrabFood" : "Foodpanda",
      Rating: parseFloat(r.rating),
      Last_Scraped: r.last_scraped
        ? new Date(r.last_scraped).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })
        : "",
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
