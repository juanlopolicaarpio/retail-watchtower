"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatTimeAgo } from "@/lib/utils";
import { TrendingUp, Clock, RefreshCw } from "lucide-react";

interface Summary {
  current: {
    total: string;
    online: string;
    offline: string;
    blocked: string;
    errors: string;
    online_pct: string;
    grabfood_total: string;
    grabfood_online: string;
    foodpanda_total: string;
    foodpanda_online: string;
    last_checked: string;
  };
  trend: { day: string; online_pct: string; online: string; total: string }[];
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "red" | "amber" | "default";
}) {
  const colors = {
    green: "text-green-700",
    red: "text-red-600",
    amber: "text-amber-600",
    default: "text-[#1F2937]",
  };
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colors[accent ?? "default"]}`}>{value}</p>
      {sub && <p className="text-[12px] text-[#6B7280] mt-0.5">{sub}</p>}
    </div>
  );
}

function PlatformBar({
  label,
  online,
  total,
  color,
}: {
  label: string;
  online: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[#374151]">{label}</span>
        <span className="text-[12px] text-[#6B7280]">
          {online}/{total} <span className="text-[#9CA3AF]">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
        />
      </div>
    </div>
  );
}

export default function ExecutiveOverview() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores/summary");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const c = data?.current;
  const trend = (data?.trend ?? []).map((t) => ({
    ...t,
    label: new Date(t.day).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }),
    pct: parseFloat(t.online_pct),
  }));

  const gfPct = c ? Math.round((parseInt(c.grabfood_online) / parseInt(c.grabfood_total || "1")) * 100) : 0;
  const fpPct = c ? Math.round((parseInt(c.foodpanda_online) / parseInt(c.foodpanda_total || "1")) * 100) : 0;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Executive Overview</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Real-time fleet status across all Juniper Eats stores on GrabFood and Foodpanda.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#1F2937] transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Insight callout */}
      {c && (
        <div className="mb-5 px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-start gap-3">
          <TrendingUp size={14} className="text-[#6B7280] mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mr-2">FLEET STATUS</span>
            <span className="text-[12px] text-[#374151]">
              {parseFloat(c.online_pct) >= 90
                ? `Fleet is performing well — ${c.online_pct}% of stores are currently online.`
                : parseFloat(c.online_pct) >= 70
                ? `Fleet health is moderate — ${c.offline} stores are offline. Monitor closely.`
                : `Fleet health is critical — only ${c.online_pct}% online. Immediate action required.`}
            </span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Stores" value={c?.total ?? "—"} />
        <StatCard label="Online" value={c?.online ?? "—"} accent="green" />
        <StatCard label="Offline" value={c?.offline ?? "—"} accent={parseInt(c?.offline ?? "0") > 0 ? "red" : "default"} />
        <StatCard
          label="Uptime"
          value={c ? `${c.online_pct}%` : "—"}
          accent={parseFloat(c?.online_pct ?? "100") >= 90 ? "green" : parseFloat(c?.online_pct ?? "100") >= 70 ? "amber" : "red"}
          sub={c?.last_checked ? `Checked ${formatTimeAgo(c.last_checked)}` : undefined}
        />
      </div>

      {/* Platform split + chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Platform bars */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-4">By Platform</p>
          <div className="space-y-4">
            <PlatformBar
              label="GrabFood"
              online={parseInt(c?.grabfood_online ?? "0")}
              total={parseInt(c?.grabfood_total ?? "0")}
              color="bg-[#00B14F]"
            />
            <PlatformBar
              label="Foodpanda"
              online={parseInt(c?.foodpanda_online ?? "0")}
              total={parseInt(c?.foodpanda_total ?? "0")}
              color="bg-[#D70F64]"
            />
          </div>

          <div className="mt-5 pt-4 border-t border-[#F3F4F6] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-0.5">GrabFood</p>
              <p className={`text-lg font-semibold ${gfPct >= 90 ? "text-green-700" : gfPct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                {gfPct}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-0.5">Foodpanda</p>
              <p className={`text-lg font-semibold ${fpPct >= 90 ? "text-green-700" : fpPct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                {fpPct}%
              </p>
            </div>
          </div>
        </div>

        {/* 7-day trend */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 md:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">
            Daily Online Rate — Last 7 Days
          </p>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, border: "1px solid #E5E7EB", borderRadius: 6, boxShadow: "none" }}
                  formatter={(v: any) => [`${v}%`, "Online"]}
                />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                  {trend.map((t, i) => (
                    <Cell key={i} fill={t.pct >= 90 ? "#16a34a" : t.pct >= 70 ? "#d97706" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[12px] text-[#9CA3AF]">
              No trend data available yet
            </div>
          )}
        </div>
      </div>

      {/* Last updated */}
      {c?.last_checked && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
          <Clock size={11} />
          Last check: {new Date(c.last_checked).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={16} className="animate-spin text-[#9CA3AF]" />
        </div>
      )}
    </div>
  );
}
