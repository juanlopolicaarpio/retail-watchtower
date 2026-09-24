import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoSkuCompliance } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "All";
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    const products = new Map<string, { name: string; stores: string[]; platforms: Set<string> }>();
    for (const row of demoSkuCompliance.filter((item) => platform === "All" || item.platform === platform.toLowerCase())) {
      for (const product of row.out_of_stock_skus) {
        const current = products.get(product.sku_code) ?? { name: product.product_name, stores: [], platforms: new Set<string>() };
        current.stores.push(row.display_name);
        current.platforms.add(row.platform);
        products.set(product.sku_code, current);
      }
    }
    return NextResponse.json([...products.entries()].map(([sku, value]) => ({
      Product_Name: value.name,
      SKU_Code: sku,
      Out_of_Stock_Count: value.stores.length,
      Stores: value.stores.join(", "),
      Platforms: [...value.platforms].join(", "),
    })));
  }

  try {
    const rows = await db.execute(sql`
      WITH latest_checks AS (
        SELECT DISTINCT ON (ssc.store_id)
          ssc.store_id, ssc.out_of_stock_skus, ssc.check_date
        FROM store_sku_checks ssc
        WHERE ssc.check_date >= CURRENT_DATE - (${days} || ' days')::interval
        ORDER BY ssc.store_id, ssc.check_date DESC
      ),
      oos_flat AS (
        SELECT
          lc.store_id,
          COALESCE(s.name_override, s.name) AS store_name,
          s.platform,
          sk AS sku_code
        FROM latest_checks lc
        JOIN stores s ON s.id = lc.store_id
        CROSS JOIN LATERAL unnest(lc.out_of_stock_skus) AS sk
        WHERE ${platform !== "All" ? sql`s.platform = ${platform.toLowerCase()}` : sql`true`}
      )
      SELECT
        COALESCE(ms.product_name, ofs.sku_code) AS product_name,
        ofs.sku_code,
        COUNT(DISTINCT ofs.store_id) AS out_of_stock_count,
        STRING_AGG(DISTINCT ofs.store_name ORDER BY ofs.store_name, ',' ) AS stores,
        STRING_AGG(DISTINCT CASE WHEN ofs.platform = 'grabfood' THEN 'GrabFood' ELSE 'Foodpanda' END, ',') AS platforms
      FROM oos_flat ofs
      LEFT JOIN master_skus ms ON ms.sku_code = ofs.sku_code AND ms.platform = ofs.platform
      GROUP BY COALESCE(ms.product_name, ofs.sku_code), ofs.sku_code
      ORDER BY out_of_stock_count DESC, product_name
    `);

    const result = (rows as any[]).map((r) => ({
      Product_Name: r.product_name,
      SKU_Code: r.sku_code,
      Out_of_Stock_Count: parseInt(r.out_of_stock_count),
      Stores: r.stores ?? "",
      Platforms: r.platforms ?? "",
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
