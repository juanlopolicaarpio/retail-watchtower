import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoSkuCompliance } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "All";
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(demoSkuCompliance
      .filter((row) => platform === "All" || row.platform === platform.toLowerCase())
      .map((row) => ({
        Date: row.check_date.slice(0, 10),
        Store: row.display_name,
        Platform: row.platform === "grabfood" ? "GrabFood" : "Foodpanda",
        "Availability_%": `${row.compliance_percentage.toFixed(1)}%`,
        Out_of_Stock_Count: row.out_of_stock_count,
        Out_of_Stock_Items: row.out_of_stock_skus.map((item) => item.product_name).join(", "),
        Check_Time: "11:30 AM",
      })));
  }

  try {
    const rows = await db.execute(sql`
      WITH oos_names AS (
        SELECT
          ssc.id AS check_id,
          STRING_AGG(
            COALESCE(ms.product_name, sk),
            ', ' ORDER BY COALESCE(ms.product_name, sk)
          ) AS oos_items_list
        FROM store_sku_checks ssc
        CROSS JOIN LATERAL unnest(ssc.out_of_stock_skus) AS sk
        LEFT JOIN stores s2 ON s2.id = ssc.store_id
        LEFT JOIN master_skus ms ON ms.sku_code = sk AND ms.platform = s2.platform
        WHERE ssc.check_date >= CURRENT_DATE - (${days} || ' days')::interval
        GROUP BY ssc.id
      )
      SELECT
        ssc.check_date::text AS date,
        COALESCE(s.name_override, s.name) AS store,
        s.platform,
        ssc.compliance_percentage,
        ssc.out_of_stock_count,
        COALESCE(on2.oos_items_list, '') AS out_of_stock_items,
        (ssc.created_at AT TIME ZONE 'Asia/Manila')::time AS check_time
      FROM store_sku_checks ssc
      JOIN stores s ON s.id = ssc.store_id
      LEFT JOIN oos_names on2 ON on2.check_id = ssc.id
      WHERE ssc.check_date >= CURRENT_DATE - (${days} || ' days')::interval
        ${platform !== "All" ? sql`AND s.platform = ${platform.toLowerCase()}` : sql``}
      ORDER BY ssc.check_date DESC, store
    `);

    const result = (rows as any[]).map((r) => ({
      Date: r.date,
      Store: String(r.store).replace(/^Juniper Eats\s+/i, ""),
      Platform: r.platform === "grabfood" ? "GrabFood" : "Foodpanda",
      "Availability_%": r.compliance_percentage != null ? `${parseFloat(r.compliance_percentage).toFixed(1)}%` : "N/A",
      Out_of_Stock_Count: r.out_of_stock_count ?? 0,
      Out_of_Stock_Items: r.out_of_stock_items ?? "",
      Check_Time: r.check_time
        ? new Date(`1970-01-01T${r.check_time}`).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })
        : "",
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
