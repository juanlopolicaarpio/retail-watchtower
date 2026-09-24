"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn, formatPlatform } from "@/lib/utils";
import { ExportMenu } from "@/components/export-menu";

interface StoreScore {
  id: number;
  display_name: string;
  platform: string;
  uptime_pct: number | null;
  compliance_pct: number | null;
  current_rating: number | null;
  perfect_score: number;
}

const PLATFORMS = ["All", "GrabFood", "Foodpanda"];

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[15px]">🥇</span>;
  if (rank === 2) return <span className="text-[15px]">🥈</span>;
  if (rank === 3) return <span className="text-[15px]">🥉</span>;
  return <span className="text-[12px] font-medium text-[#9CA3AF] w-5 text-center">{rank}</span>;
}

function ScoreBar({ value, max = 100, color }: { value: number | null; max?: number; color: string }) {
  if (value == null) return <span className="text-[11px] text-[#D1D5DB]">—</span>;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] text-[#374151] font-medium tabular-nums">{value.toFixed(1)}%</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [stores, setStores] = useState<StoreScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) setStores(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return stores
      .filter((s) => {
        const matchPlatform = platform === "All" || formatPlatform(s.platform) === platform;
        return matchPlatform && s.display_name.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => sort === "desc" ? b.perfect_score - a.perfect_score : a.perfect_score - b.perfect_score);
  }, [stores, platform, search, sort]);

  const top3 = useMemo(() => stores.slice(0, 3), [stores]);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Store Rankings</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Ranked by combined uptime (50%) and SKU compliance (50%). The best stores across all metrics.
        </p>
      </div>

      {/* Top 3 podium */}
      {!loading && top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {top3.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "bg-white border rounded-lg p-4",
                i === 0 ? "border-amber-200 bg-amber-50/40" : "border-[#E5E7EB]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Medal rank={i + 1} />
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  s.platform === "grabfood"
                    ? "text-[#00B14F] bg-green-50 border-green-200"
                    : "text-[#D70F64] bg-pink-50 border-pink-200"
                )}>
                  {formatPlatform(s.platform)}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-[#111827] leading-tight mb-2">{s.display_name}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Score</p>
                  <p className="text-2xl font-bold text-[#1E1130]">{s.perfect_score.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#9CA3AF]">Uptime / SKU</p>
                  <p className="text-[12px] text-[#374151]">
                    {s.uptime_pct?.toFixed(0) ?? "—"}% / {s.compliance_pct?.toFixed(0) ?? "—"}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 px-3 text-[12px] border border-[#E5E7EB] rounded bg-white text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:border-[#9CA3AF] w-52"
        />
        <div className="flex rounded border border-[#E5E7EB] overflow-hidden bg-white">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "px-3 h-8 text-[11px] font-medium transition-colors",
                platform === p
                  ? "bg-[#1E1130] text-white"
                  : "text-[#6B7280] hover:bg-[#F9FAFB]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
          className="h-8 px-3 text-[11px] font-medium border border-[#E5E7EB] rounded bg-white text-[#6B7280] hover:bg-[#F9FAFB] flex items-center gap-1.5"
        >
          Score {sort === "desc" ? "↓" : "↑"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ExportMenu
            platform={platform}
            options={[
              { label: "Store Rankings", url: "/api/leaderboard", filename: "store_rankings" },
              { label: "Uptime Report", url: "/api/export/uptime", filename: "uptime_report" },
              { label: "Store Performance (SKU)", url: "/api/export/sku/performance", filename: "store_performance" },
            ]}
          />
          <button onClick={load} className="text-[11px] text-[#9CA3AF] hover:text-[#1F2937] flex items-center gap-1">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[540px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] w-10">#</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Store</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">Platform</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden md:table-cell">Uptime 7d</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden md:table-cell">SKU Compliance</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">Rating</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#9CA3AF]">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#9CA3AF]">No stores found</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-[#F9FAFB] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-2.5">
                    <Medal rank={i + 1} />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[#111827]">{s.display_name}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                      s.platform === "grabfood"
                        ? "text-[#00B14F] bg-green-50 border-green-200"
                        : "text-[#D70F64] bg-pink-50 border-pink-200"
                    )}>
                      {formatPlatform(s.platform)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <ScoreBar value={s.uptime_pct} color="bg-[#1E1130]" />
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <ScoreBar
                      value={s.compliance_pct}
                      color={
                        (s.compliance_pct ?? 0) >= 90 ? "bg-green-500" :
                        (s.compliance_pct ?? 0) >= 70 ? "bg-amber-400" : "bg-red-500"
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-[#374151]">
                    {s.current_rating != null ? (
                      <span className="flex items-center gap-1">
                        <span className="text-amber-400">★</span>
                        {s.current_rating.toFixed(1)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "font-semibold",
                      s.perfect_score >= 90 ? "text-green-700" :
                      s.perfect_score >= 70 ? "text-amber-600" : "text-red-600"
                    )}>
                      {s.perfect_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
