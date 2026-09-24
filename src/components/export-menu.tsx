"use client";

import { useRef, useState } from "react";
import { Download, ChevronDown, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/export-csv";

interface ExportOption {
  label: string;
  url: string;
  filename: string;
}

interface ExportMenuProps {
  options: ExportOption[];
  days?: number;
  platform?: string;
}

export function ExportMenu({ options, days = 30, platform = "All" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(days);
  const ref = useRef<HTMLDivElement>(null);

  const run = async (opt: ExportOption) => {
    setLoading(opt.label);
    setOpen(false);
    try {
      const params = new URLSearchParams({ days: String(selectedDays) });
      if (platform !== "All") params.set("platform", platform);
      const res = await fetch(`${opt.url}?${params}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error(data.error ?? "Export failed");
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`${opt.filename}_${date}.csv`, data);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#1F2937] transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader size={11} className="animate-spin" />
        ) : (
          <Download size={11} />
        )}
        {loading ? loading : "Export"}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 min-w-[220px]">
            {/* Day range selector */}
            <div className="px-3 py-2 border-b border-[#F3F4F6]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1.5">Period</p>
              <div className="flex gap-1">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDays(d)}
                    className={cn(
                      "flex-1 text-[10px] py-0.5 rounded border transition-colors",
                      selectedDays === d
                        ? "bg-[#1E1130] text-white border-[#1E1130]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Export options */}
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => run(opt)}
                className="w-full text-left px-3 py-2 text-[12px] text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
              >
                <Download size={10} className="text-[#9CA3AF] shrink-0" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
