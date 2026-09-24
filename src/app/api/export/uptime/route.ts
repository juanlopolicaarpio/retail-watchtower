import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { demoUptime } from "@/lib/demo-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(demoUptime.map((row) => ({
      Store: row.display_name,
      Platform: row.platform === "grabfood" ? "GrabFood" : "Foodpanda",
      Period_Start: "2026-09-17",
      Period_End: "2026-09-23",
      Uptime: `${row.uptime_pct.toFixed(1)}%`,
      Total_Checks: row.total_checks,
      Offline_Count: row.total_checks - row.online_checks,
      Offline_Events: "Synthetic demonstration data",
    })));
  }

  try {
    const [uptimeRows, offlineRows] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE(s.name_override, s.name) AS store_name,
          s.platform,
          MIN(ssh.effective_at AT TIME ZONE 'Asia/Manila')::date AS period_start,
          MAX(ssh.effective_at AT TIME ZONE 'Asia/Manila')::date AS period_end,
          ROUND(
            SUM(CASE WHEN ssh.online > 0 THEN ssh.online ELSE 0 END)::numeric
            / NULLIF(SUM(ssh.total), 0) * 100, 1
          ) AS uptime_percent,
          SUM(ssh.total) AS total_checks,
          SUM(CASE WHEN ssh.online = 0 AND ssh.total > 0 THEN 1 ELSE 0 END) AS offline_count
        FROM stores s
        JOIN store_status_hourly ssh ON ssh.store_id = s.id
        WHERE ssh.effective_at >= NOW() - (${days} || ' days')::interval
        GROUP BY s.id, s.name_override, s.name, s.platform
        ORDER BY s.platform, store_name
      `),
      db.execute(sql`
        SELECT
          COALESCE(s.name_override, s.name) AS store_name,
          s.platform,
          sc.checked_at AT TIME ZONE 'Asia/Manila' AS offline_at
        FROM stores s
        JOIN status_checks sc ON sc.store_id = s.id
        WHERE sc.is_online = false
          AND sc.checked_at >= NOW() - (${days} || ' days')::interval
        ORDER BY s.platform, store_name, sc.checked_at
      `),
    ]);

    // Build offline events map
    const offlineMap = new Map<string, string[]>();
    for (const row of offlineRows as any[]) {
      const key = `${row.store_name}||${row.platform}`;
      const ts = new Date(row.offline_at);
      const label = ts.toLocaleString("en-PH", {
        timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      if (!offlineMap.has(key)) offlineMap.set(key, []);
      offlineMap.get(key)!.push(label);
    }

    const rows = (uptimeRows as any[]).map((r) => {
      const key = `${r.store_name}||${r.platform}`;
      const events = offlineMap.get(key) ?? [];
      const name = String(r.store_name).replace(/^Juniper Eats\s+/i, "");
      const platform = r.platform === "grabfood" ? "GrabFood" : "Foodpanda";
      return {
        Store_Name: name,
        Platform: platform,
        Period_Start: new Date(r.period_start).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        Period_End: new Date(r.period_end).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        Uptime_Percent: parseFloat(r.uptime_percent ?? "0"),
        Total_Checks: parseInt(r.total_checks ?? "0"),
        Offline_Count: parseInt(r.offline_count ?? "0"),
        All_Offline_Events: events.join(" | "),
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
