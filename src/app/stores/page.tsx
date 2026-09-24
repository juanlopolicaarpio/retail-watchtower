"use client";

import { useEffect, useMemo, useState } from "react";
import { cn, formatPlatform, formatTimeAgo } from "@/lib/utils";
import { downloadCsv } from "@/lib/export-csv";
import { ExportMenu } from "@/components/export-menu";
import { RefreshCw, Search, Bell, X, AlertTriangle, ExternalLink, Download } from "lucide-react";

interface Store {
  id: number;
  display_name: string;
  name: string;
  url: string;
  platform: string;
  is_online: boolean | null;
  checked_at: string | null;
  response_time_ms: number | null;
  error_message: string | null;
  status: string | null;
  confidence: number | null;
}

const PLATFORMS = ["All", "GrabFood", "Foodpanda"];
const STATUS_FILTERS = ["All", "Online", "Offline", "Issues"];

function resolveStatus(store: Store) {
  if (store.status) return store.status.toUpperCase();
  if (store.is_online === true) return "ONLINE";
  if (store.is_online === false) return "OFFLINE";
  return "UNKNOWN";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ONLINE: "bg-green-50 text-green-700 border-green-200",
    OFFLINE: "bg-red-50 text-red-700 border-red-200",
    BLOCKED: "bg-amber-50 text-amber-700 border-amber-200",
    ERROR: "bg-orange-50 text-orange-700 border-orange-200",
    UNKNOWN: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide", styles[status] ?? styles.UNKNOWN)}>
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-1.5 py-0.5 rounded border",
      platform === "grabfood"
        ? "text-[#00B14F] bg-green-50 border-green-200"
        : "text-[#D70F64] bg-pink-50 border-pink-200"
    )}>
      {formatPlatform(platform)}
    </span>
  );
}

function AlertModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number; branch: string; simulated?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/sms/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: store.display_name, storeUrl: store.url, platform: store.platform }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to send");
      else setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={13} className="text-red-600" />
            </div>
            <span className="text-[13px] font-semibold text-[#111827]">Send Offline Alert</span>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] p-1 rounded hover:bg-[#F3F4F6]">
            <X size={14} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6]">
          <p className="text-[12px] font-medium text-[#111827]">{store.display_name}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{formatPlatform(store.platform)} · offline</p>
        </div>

        <p className="text-[12px] text-[#6B7280] mb-4">
          This demonstrates the escalation that would notify the store and area managers when a location goes offline.
        </p>

        {result ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700 font-medium">
            {result.simulated ? "Demo escalation prepared" : `Sent to ${result.sent}/${result.total} contacts`} · branch {result.branch}
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{error}</div>
        ) : (
          <button
            onClick={send}
            disabled={sending}
            className="w-full h-9 bg-red-600 text-white text-[12px] font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {sending ? "Preparing alert…" : "Simulate Alert"}
          </button>
        )}
      </div>
    </div>
  );
}

function StoreRow({ store, onAlert }: { store: Store & { _status: string }; onAlert: (s: Store) => void }) {
  const status = store._status;
  const isProblematic = status !== "ONLINE";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors group",
    )}>
      {/* Status dot */}
      <span className={cn(
        "w-2 h-2 rounded-full shrink-0",
        status === "ONLINE" ? "bg-green-500" :
        status === "OFFLINE" ? "bg-red-500" :
        status === "BLOCKED" ? "bg-amber-400" :
        status === "ERROR" ? "bg-orange-400" : "bg-gray-300"
      )} />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#111827] truncate">{store.display_name}</span>
          {store.url && (
            <a
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-[#374151]"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Platform */}
      <div className="hidden sm:block w-20 shrink-0">
        <PlatformBadge platform={store.platform} />
      </div>

      {/* Status */}
      <div className="w-20 shrink-0">
        <StatusBadge status={status} />
      </div>

      {/* Alert button */}
      <div className="w-16 flex justify-end shrink-0">
        {isProblematic ? (
          <button
            onClick={() => onAlert(store)}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Bell size={10} /> Alert
          </button>
        ) : (
          <span className="w-14" />
        )}
      </div>
    </div>
  );
}

function StatusGroup({
  label,
  stores,
  onAlert,
  defaultOpen = true,
}: {
  label: string;
  stores: (Store & { _status: string })[];
  onAlert: (s: Store) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (stores.length === 0) return null;

  const dotColor =
    label === "OFFLINE" ? "bg-red-500" :
    label === "BLOCKED" || label === "ERROR" ? "bg-amber-400" : "bg-green-500";

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-t-lg text-left"
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#374151]">{label}</span>
        <span className="text-[11px] text-[#9CA3AF] ml-1">({stores.length})</span>
        <span className="ml-auto text-[11px] text-[#9CA3AF]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border border-t-0 border-[#E5E7EB] rounded-b-lg bg-white overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-[#F3F4F6] bg-[#FAFAFA]">
            <span className="w-2 shrink-0" />
            <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Store</span>
            <span className="w-20 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] shrink-0">Platform</span>
            <span className="w-20 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] shrink-0">Status</span>
            <span className="w-16 shrink-0" />
          </div>
          {stores.map((s) => (
            <StoreRow key={`${s.id}-${s.platform}`} store={s} onAlert={onAlert} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [platform, setPlatform] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [alertStore, setAlertStore] = useState<Store | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores/status");
      if (res.ok) {
        setStores(await res.json());
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Resolve status once per store to avoid repeated calls during filter/grouping
  const storesWithStatus = useMemo(
    () => stores.map((s) => ({ ...s, _status: resolveStatus(s) })),
    [stores]
  );

  const { filtered, offline, issues, online, totalOnline, totalOffline, totalIssues } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filtered = storesWithStatus.filter((s) => {
      const matchPlatform = platform === "All" || formatPlatform(s.platform) === platform;
      const matchStatus =
        statusFilter === "All" ? true :
        statusFilter === "Online" ? s._status === "ONLINE" :
        statusFilter === "Offline" ? s._status === "OFFLINE" :
        ["BLOCKED", "ERROR", "UNKNOWN"].includes(s._status);
      return matchPlatform && matchStatus && s.display_name.toLowerCase().includes(searchLower);
    });

    return {
      filtered,
      offline: filtered.filter((s) => s._status === "OFFLINE"),
      issues: filtered.filter((s) => ["BLOCKED", "ERROR", "UNKNOWN"].includes(s._status)),
      online: filtered.filter((s) => s._status === "ONLINE"),
      totalOnline: storesWithStatus.filter((s) => s._status === "ONLINE").length,
      totalOffline: storesWithStatus.filter((s) => s._status === "OFFLINE").length,
      totalIssues: storesWithStatus.filter((s) => ["BLOCKED", "ERROR", "UNKNOWN"].includes(s._status)).length,
    };
  }, [storesWithStatus, platform, statusFilter, search]);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Store Monitor</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Live status across all stores. Use Alert to preview the escalation workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(`store_status_${new Date().toISOString().slice(0,10)}.csv`,
              filtered.map((s) => ({
                Store: s.display_name,
                Platform: formatPlatform(s.platform),
                Status: s._status,
                URL: s.url,
              }))
            )}
            className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#1F2937] transition-colors"
          >
            <Download size={11} /> Status
          </button>
          <ExportMenu
            options={[
              { label: "Uptime Report", url: "/api/export/uptime", filename: "uptime_report" },
            ]}
          />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#1F2937] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {lastUpdated ? formatTimeAgo(lastUpdated) : "Refresh"}
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[12px] font-semibold text-green-700">{totalOnline}</span>
          <span className="text-[11px] text-green-600">Online</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[12px] font-semibold text-red-700">{totalOffline}</span>
          <span className="text-[11px] text-red-600">Offline</span>
        </div>
        {totalIssues > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[12px] font-semibold text-amber-700">{totalIssues}</span>
            <span className="text-[11px] text-amber-600">Issues</span>
          </div>
        )}
        <span className="text-[11px] text-[#9CA3AF]">{stores.length} stores total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative w-full sm:w-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search store…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 pr-3 text-[12px] border border-[#E5E7EB] rounded-lg bg-white text-[#1F2937] placeholder-[#9CA3AF] outline-none focus:border-[#9CA3AF] w-full sm:w-44"
          />
        </div>
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={cn("px-3 h-8 text-[11px] font-medium transition-colors",
                platform === p ? "bg-[#1E1130] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
          {STATUS_FILTERS.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("px-3 h-8 text-[11px] font-medium transition-colors",
                statusFilter === f ? "bg-[#1E1130] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && stores.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={16} className="animate-spin text-[#9CA3AF]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[13px] text-[#9CA3AF]">No stores match your filters</div>
      ) : (
        <>
          <StatusGroup label="OFFLINE" stores={offline} onAlert={setAlertStore} defaultOpen />
          <StatusGroup label="BLOCKED / ERROR" stores={issues} onAlert={setAlertStore} defaultOpen />
          <StatusGroup label="ONLINE" stores={online} onAlert={setAlertStore} defaultOpen={offline.length + issues.length < 5} />
        </>
      )}

      {alertStore && <AlertModal store={alertStore} onClose={() => setAlertStore(null)} />}
    </div>
  );
}
