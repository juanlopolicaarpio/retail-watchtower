"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn, formatPlatform, getComplianceBg } from "@/lib/utils";
import { ExportMenu } from "@/components/export-menu";
import { RefreshCw, Search, Bell, ChevronDown, ChevronRight, X, Package } from "lucide-react";

interface SkuStore {
  id: number;
  display_name: string;
  platform: string;
  url: string;
  compliance_percentage: number | null;
  out_of_stock_count: number | null;
  total_skus_checked: number | null;
  out_of_stock_skus: string | unknown[] | null;
  check_date: string | null;
  notes: string | null;
}

interface OosItem {
  product_name?: string;
  name?: string;
  item_name?: string;
  sku_code?: string;
  sku?: string;
  category?: string;
  gmv_q3?: number;
}

const PLATFORMS = ["All", "GrabFood", "Foodpanda"];
const TIERS = ["All", "100%", "90%+", "70–89%", "Below 70%"];

function parseOosItems(raw: string | unknown[] | null): OosItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    // PostgreSQL text[] comes back as string[] (plain SKU codes)
    if (typeof raw[0] === "string") {
      return (raw as string[]).map((s) => ({ sku_code: s }));
    }
    return raw as OosItem[];
  }
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === "string") {
        return parsed.map((s: string) => ({ sku_code: s }));
      }
      return parsed;
    }
    return [];
  } catch {
    return raw.split(",").map((s) => ({ sku_code: s.trim() }));
  }
}

function AlertModal({
  store,
  oosItems,
  onClose,
}: {
  store: SkuStore;
  oosItems: OosItem[];
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/sms/oos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: store.display_name,
          storeUrl: store.url,
          oosItems,
          compliancePct: store.compliance_percentage,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed");
      else setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-lg p-5 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-[#111827]">Alert Store Manager</span>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]"><X size={14} /></button>
        </div>

        <p className="text-[12px] text-[#374151] mb-1">
          <span className="font-medium">{store.display_name}</span> has <span className="text-red-600 font-medium">{oosItems.length} OOS items</span> ({store.compliance_percentage?.toFixed(1)}% compliance).
        </p>
        <p className="text-[12px] text-[#6B7280] mb-3">
          This demonstrates the escalation sent to store and area managers with the out-of-stock items.
        </p>

        {oosItems.length > 0 && (
          <div className="mb-4 p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] space-y-1 max-h-32 overflow-y-auto">
            {oosItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-red-400">•</span>
                <span className="text-[#374151]">{item.product_name ?? item.name ?? item.item_name ?? item.sku_code ?? item.sku ?? "—"}</span>
                {item.sku_code && <span className="text-[#9CA3AF]">({item.sku_code})</span>}
              </div>
            ))}
            {oosItems.length > 8 && <p className="text-[#9CA3AF]">+{oosItems.length - 8} more</p>}
          </div>
        )}

        {result ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-[12px] text-green-700">
            {result.simulated ? "Demo escalation prepared" : `Sent to ${result.sent}/${result.total} contacts`}
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-[12px] text-red-600">{error}</div>
        ) : (
          <button onClick={send} disabled={sending}
            className="w-full h-9 bg-[#1E1130] text-white text-[12px] font-medium rounded hover:bg-[#2d1a47] transition-colors disabled:opacity-60">
            {sending ? "Preparing..." : "Simulate OOS Alert"}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

function StoreRow({ store }: { store: SkuStore }) {
  const [expanded, setExpanded] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const oos = parseOosItems(store.out_of_stock_skus);
  const pct = store.compliance_percentage ?? 0;

  return (
    <>
      <tr
        className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2.5 w-5">
          {oos.length > 0
            ? expanded ? <ChevronDown size={12} className="text-[#9CA3AF]" /> : <ChevronRight size={12} className="text-[#9CA3AF]" />
            : <span className="w-3 inline-block" />}
        </td>
        <td className="px-4 py-2.5 font-medium text-[12px] text-[#111827]">{store.display_name}</td>
        <td className="px-4 py-2.5 hidden sm:table-cell">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border",
            store.platform === "grabfood" ? "text-[#00B14F] bg-green-50 border-green-200" : "text-[#D70F64] bg-pink-50 border-pink-200")}>
            {formatPlatform(store.platform)}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded border", getComplianceBg(pct))}>
            {pct.toFixed(1)}%
          </span>
        </td>
        <td className="px-4 py-2.5 text-[12px] text-[#374151] hidden sm:table-cell">
          {store.out_of_stock_count ?? 0} / {store.total_skus_checked ?? 0}
        </td>
        <td className="px-4 py-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); setAlertOpen(true); }}
            className={cn(
              "flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors",
              oos.length > 0
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-[#E5E7EB] text-[#D1D5DB] cursor-not-allowed"
            )}
            disabled={oos.length === 0}
          >
            <Bell size={10} /> Alert
          </button>
        </td>
      </tr>

      {expanded && oos.length > 0 && (
        <tr className="bg-[#FAFAFA]">
          <td colSpan={6} className="px-6 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">Out of Stock Items</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {oos.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-[#F3F4F6] rounded px-2.5 py-1.5">
                  <Package size={10} className="text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#111827] truncate">{item.product_name ?? item.name ?? item.item_name ?? item.sku_code ?? item.sku ?? "—"}</p>
                    {item.sku_code && <p className="text-[10px] text-[#9CA3AF]">{item.sku_code}</p>}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}

      {alertOpen && <AlertModal store={store} oosItems={oos} onClose={() => setAlertOpen(false)} />}
    </>
  );
}

export default function SkuPage() {
  const [stores, setStores] = useState<SkuStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("All");
  const [tier, setTier] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sku/compliance");
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
        const pct = s.compliance_percentage ?? 0;
        const matchPlatform = platform === "All" || formatPlatform(s.platform) === platform;
        const matchTier =
          tier === "All" ? true :
          tier === "100%" ? pct === 100 :
          tier === "90%+" ? pct >= 90 && pct < 100 :
          tier === "70–89%" ? pct >= 70 && pct < 90 :
          pct < 70;
        return matchPlatform && matchTier && s.display_name.toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        const ap = a.compliance_percentage ?? 0;
        const bp = b.compliance_percentage ?? 0;
        return sort === "asc" ? ap - bp : bp - ap;
      });
  }, [stores, platform, tier, search, sort]);

  const { avgCompliance, withOos, below80 } = useMemo(() => ({
    avgCompliance: stores.length
      ? (stores.reduce((sum, s) => sum + (s.compliance_percentage ?? 0), 0) / stores.length).toFixed(1)
      : "—",
    withOos: stores.filter((s) => (s.out_of_stock_count ?? 0) > 0).length,
    below80: stores.filter((s) => (s.compliance_percentage ?? 0) < 80).length,
  }), [stores]);

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">SKU Availability</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Click a store to see OOS items. Alert the manager directly from here.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Avg Compliance</p>
          <p className="text-xl font-semibold text-[#111827]">{avgCompliance}%</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Stores with OOS</p>
          <p className={cn("text-xl font-semibold", withOos > 0 ? "text-amber-600" : "text-[#111827]")}>{withOos}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Below 80%</p>
          <p className={cn("text-xl font-semibold", below80 > 0 ? "text-red-600" : "text-[#111827]")}>{below80}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
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
        <div className="flex rounded border border-[#E5E7EB] overflow-hidden bg-white">
          {TIERS.map((t) => (
            <button key={t} onClick={() => setTier(t)}
              className={cn("px-2.5 h-8 text-[11px] font-medium transition-colors",
                tier === t ? "bg-[#1E1130] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
          className="h-8 px-3 text-[11px] font-medium border border-[#E5E7EB] rounded bg-white text-[#6B7280] hover:bg-[#F9FAFB]">
          Compliance {sort === "asc" ? "↑" : "↓"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ExportMenu
            platform={platform}
            options={[
              { label: "Daily Availability Summary", url: "/api/export/sku/daily", filename: "daily_availability_summary" },
              { label: "OOS Items Report", url: "/api/export/sku/oos-items", filename: "oos_items_report" },
              { label: "Store Performance Report", url: "/api/export/sku/performance", filename: "store_performance" },
            ]}
          />
          <button onClick={load} className="text-[11px] text-[#9CA3AF] hover:text-[#1F2937] flex items-center gap-1">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[420px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="px-4 py-2.5 w-6" />
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Store</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">Platform</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Compliance</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">OOS / Total</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#9CA3AF]">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#9CA3AF]">No data available</td></tr>
            ) : (
              filtered.map((s) => <StoreRow key={`${s.id}-${s.platform}`} store={s} />)
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
