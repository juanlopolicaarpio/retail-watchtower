import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoSkuCompliance } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "All";
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    const filtered = demoSkuCompliance.filter((row) => platform === "All" || row.platform === platform.toLowerCase());
    return NextResponse.json([{
      Date: "2026-09-23",
      Platform: platform,
      Stores_Checked: filtered.length,
      Average_Availability: `${(filtered.reduce((sum, row) => sum + row.compliance_percentage, 0) / filtered.length).toFixed(1)}%`,
      "100%_Available": filtered.filter((row) => row.compliance_percentage === 100).length,
      "80%+_Available": filtered.filter((row) => row.compliance_percentage >= 80 && row.compliance_percentage < 100).length,
      "Below_80%": filtered.filter((row) => row.compliance_percentage < 80).length,
      Total_OOS_Items: filtered.reduce((sum, row) => sum + row.out_of_stock_count, 0),
      Stores_with_OOS: filtered.filter((row) => row.out_of_stock_count > 0).length,
    }]);
  }

  try {
    const rows = await db.execute(sql`
      SELECT
        ssc.check_date::text AS date,
        s.platform,
        COUNT(*) AS stores_checked,
        ROUND(AVG(ssc.compliance_percentage), 1) AS avg_availability,
        COUNT(*) FILTER (WHERE ssc.compliance_percentage = 100) AS perfect,
        COUNT(*) FILTER (WHERE ssc.compliance_percentage >= 80 AND ssc.compliance_percentage < 100) AS above_80,
        COUNT(*) FILTER (WHERE ssc.compliance_percentage < 80) AS below_80,
        SUM(ssc.out_of_stock_count) AS total_oos_items,
        COUNT(*) FILTER (WHERE ssc.out_of_stock_count > 0) AS stores_with_oos
      FROM store_sku_checks ssc
      JOIN stores s ON s.id = ssc.store_id
      WHERE ssc.check_date >= CURRENT_DATE - (${days} || ' days')::interval
        ${platform !== "All" ? sql`AND s.platform = ${platform.toLowerCase()}` : sql``}
      GROUP BY ssc.check_date, s.platform
      ORDER BY ssc.check_date DESC, s.platform
    `);

    const result = (rows as any[]).map((r) => ({
      Date: r.date,
      Platform: r.platform === "grabfood" ? "GrabFood" : "Foodpanda",
      Stores_Checked: parseInt(r.stores_checked),
      Average_Availability: `${parseFloat(r.avg_availability ?? "0").toFixed(1)}%`,
      "100%_Available": parseInt(r.perfect ?? "0"),
      "80%+_Available": parseInt(r.above_80 ?? "0"),
      "Below_80%": parseInt(r.below_80 ?? "0"),
      Total_OOS_Items: parseInt(r.total_oos_items ?? "0"),
      Stores_with_OOS: parseInt(r.stores_with_oos ?? "0"),
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
