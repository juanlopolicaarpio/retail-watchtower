"use client";

import { useEffect, useMemo, useState } from "react";
import { cn, formatPlatform } from "@/lib/utils";
import { ExportMenu } from "@/components/export-menu";
import { RefreshCw, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface RatingStore {
  id: number;
  display_name: string;
  platform: string;
  current_rating: number | null;
  last_scraped_at: string | null;
  rating_trend: string | null;
  trend_value: number | null;
  history: { rating: number; scraped_at: string }[] | null;
}

const PLATFORMS = ["All", "GrabFood", "Foodpanda"];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={cn("w-3 h-3", i <= Math.round(rating) ? "text-amber-400" : "text-gray-200")} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TrendIcon({ trend, value }: { trend: string | null; value: number | null }) {
  if (!trend || trend === "stable") return <Minus size={11} className="text-[#9CA3AF]" />;
  if (trend === "up") return (
    <span className="flex items-center gap-0.5 text-green-600 text-[11px]">
      <TrendingUp size={11} />
      {value != null ? `+${value.toFixed(1)}` : ""}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-red-500 text-[11px]">
      <TrendingDown size={11} />
      {value != null ? value.toFixed(1) : ""}
    </span>
  );
}

function RatingCard({
  store,
  rank,
}: {
  store: RatingStore;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const history = (store.history ?? []).map((h) => ({
    date: new Date(h.scraped_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
    rating: h.rating,
  }));

  const isDecline = store.rating_trend === "down";

  return (
    <div className={cn(
      "bg-white border rounded-lg overflow-hidden",
      isDecline ? "border-red-200" : "border-[#E5E7EB]"
    )}>
      <div
        className="p-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
        onClick={() => history.length > 0 && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-[#9CA3AF] font-medium">#{rank}</span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border",
                store.platform === "grabfood" ? "text-[#00B14F] bg-green-50 border-green-200" : "text-[#D70F64] bg-pink-50 border-pink-200")}>
                {formatPlatform(store.platform)}
              </span>
              {isDecline && (
                <span className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                  Declining
                </span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-[#111827] leading-tight truncate">{store.display_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-[#111827]">{store.current_rating?.toFixed(1) ?? "—"}</p>
            <TrendIcon trend={store.rating_trend} value={store.trend_value} />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Stars rating={store.current_rating ?? 0} />
          {store.last_scraped_at && (
            <p className="text-[10px] text-[#9CA3AF]">
              {new Date(store.last_scraped_at).toLocaleDateString("en-PH")}
            </p>
          )}
        </div>
      </div>

      {expanded && history.length > 0 && (
        <div className="border-t border-[#F3F4F6] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">30-Day History</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={history} margin={{ top: 2, right: 4, bottom: 0, left: -30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} domain={[3.5, 5]} />
              <Tooltip contentStyle={{ fontSize: 10, border: "1px solid #E5E7EB", borderRadius: 4 }} />
              <Line type="monotone" dataKey="rating" stroke={isDecline ? "#EF4444" : "#1E1130"} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function RatingsPage() {
  const [stores, setStores] = useState<RatingStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ratings");
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
      .sort((a, b) => {
        const ar = a.current_rating ?? 0;
        const br = b.current_rating ?? 0;
        return sort === "desc" ? br - ar : ar - br;
      });
  }, [stores, platform, search, sort]);

  const { avgRating, declining, top } = useMemo(() => {
    const withRating = stores.filter((s) => s.current_rating);
    const avgRating = withRating.length
      ? (withRating.reduce((sum, s) => sum + (s.current_rating ?? 0), 0) / withRating.length).toFixed(2)
      : "—";
    return {
      avgRating,
      declining: stores.filter((s) => s.rating_trend === "down").length,
      top: stores.filter((s) => (s.current_rating ?? 0) >= 4.8).length,
    };
  }, [stores]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Ratings</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Store ratings scraped from GrabFood and Foodpanda. Click a card to see trend history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            platform={platform}
            options={[
              { label: "Current Snapshot", url: "/api/export/ratings/snapshot", filename: "ratings_snapshot" },
              { label: "Rating History", url: "/api/export/ratings/history", filename: "ratings_history" },
              { label: "Store Summary Report", url: "/api/export/ratings/summary", filename: "ratings_summary" },
            ]}
          />
          <button onClick={load} className="text-[11px] text-[#9CA3AF] hover:text-[#1F2937] flex items-center gap-1">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Fleet Avg Rating</p>
          <p className="text-xl font-semibold text-[#111827]">{avgRating} ★</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Stores ≥ 4.8</p>
          <p className="text-xl font-semibold text-green-700">{top}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Declining</p>
          <p className={cn("text-xl font-semibold", declining > 0 ? "text-red-600" : "text-[#111827]")}>{declining}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 pr-3 text-[12px] border border-[#E5E7EB] rounded bg-white text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:border-[#9CA3AF] w-44"
          />
        </div>
        <div className="flex rounded border border-[#E5E7EB] overflow-hidden bg-white">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={cn("px-2.5 h-8 text-[11px] font-medium transition-colors",
                platform === p ? "bg-[#1E1130] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>
              {p}
            </button>
          ))}
        </div>
        <button onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
          className="h-8 px-3 text-[11px] font-medium border border-[#E5E7EB] rounded bg-white text-[#6B7280] hover:bg-[#F9FAFB]">
          Rating {sort === "desc" ? "↓" : "↑"}
        </button>
      </div>

      {loading && stores.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={16} className="animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((s, i) => (
            <RatingCard key={`${s.id}-${s.platform}`} store={s} rank={i + 1} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-[12px] text-[#9CA3AF]">No ratings data available yet</div>
          )}
        </div>
      )}
    </div>
  );
}
