import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverCache } from "@/lib/server-cache";
import { demoSkuCompliance } from "@/lib/demo-data";

export const revalidate = 30;

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoSkuCompliance);
  try {
    const compliance = await serverCache("sku:compliance", 30_000, () => db.execute(sql`
      WITH latest_sku AS (
        SELECT DISTINCT ON (ssc.store_id)
          ssc.store_id,
          s.platform,
          ssc.compliance_percentage,
          ssc.out_of_stock_count,
          ssc.total_skus_checked,
          ssc.out_of_stock_skus,
          ssc.check_date,
          ssc.notes
        FROM store_sku_checks ssc
        JOIN stores s ON s.id = ssc.store_id
        ORDER BY ssc.store_id, ssc.check_date DESC
      ),
      oos_enriched AS (
        SELECT
          ls.store_id,
          json_agg(
            json_build_object('sku_code', sk, 'product_name', ms.product_name, 'category', ms.category)
            ORDER BY ms.product_name NULLS LAST
          ) as oos_json
        FROM latest_sku ls
        CROSS JOIN LATERAL unnest(ls.out_of_stock_skus) AS sk
        LEFT JOIN master_skus ms ON ms.sku_code = sk AND ms.platform = ls.platform
        GROUP BY ls.store_id
      )
      SELECT
        s.id,
        COALESCE(s.name_override, s.name) as display_name,
        s.platform,
        s.url,
        ls.compliance_percentage::float,
        ls.out_of_stock_count,
        ls.total_skus_checked,
        ls.check_date,
        ls.notes,
        oe.oos_json as out_of_stock_skus
      FROM stores s
      JOIN latest_sku ls ON s.id = ls.store_id
      LEFT JOIN oos_enriched oe ON s.id = oe.store_id
      ORDER BY ls.compliance_percentage ASC
    `));

    return NextResponse.json(compliance as any[]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
