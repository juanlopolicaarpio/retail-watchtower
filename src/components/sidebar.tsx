"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Trophy, Radio, PackageSearch, Star, Menu, X } from "lucide-react";

const nav = [
  { href: "/", label: "Executive Overview", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Store Rankings", icon: Trophy },
  { href: "/stores", label: "Store Monitor", icon: Radio },
  { href: "/sku", label: "SKU Availability", icon: PackageSearch },
  { href: "/ratings", label: "Ratings", icon: Star },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors",
              active
                ? "bg-white text-[#1F2937] font-medium shadow-sm border border-[#E5E7EB]"
                : "text-[#6B7280] hover:bg-white/70 hover:text-[#1F2937]"
            )}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 2} aria-hidden />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-[#E5E7EB] flex items-center px-4 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#374151]"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="ml-3">
          <span className="text-sm font-bold tracking-[0.18em] text-[#1E1130]">WATCHTOWER</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 h-screen w-64 bg-[#F1F3F5] border-r border-[#E5E7EB] flex flex-col z-50 transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#E5E7EB]">
          <span className="text-sm font-bold tracking-[0.18em] text-[#1E1130]">WATCHTOWER</span>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-[#E5E7EB] text-[#6B7280]">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Dashboards</p>
          <NavLinks onClick={() => setMobileOpen(false)} />
        </nav>
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <p className="text-[11px] text-[#9CA3AF]">Juniper Eats Ops</p>
          <p className="text-[10px] text-[#D1D5DB]">Watchtower v1.0</p>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-[#F1F3F5] border-r border-[#E5E7EB] flex-col z-40">
        <div className="h-14 flex items-center px-4 border-b border-[#E5E7EB]">
          <span className="text-sm font-bold tracking-[0.18em] text-[#1E1130]">WATCHTOWER</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Dashboards</p>
          <NavLinks />
        </nav>
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <p className="text-[11px] text-[#9CA3AF]">Juniper Eats Ops</p>
          <p className="text-[10px] text-[#D1D5DB]">Watchtower v1.0</p>
        </div>
      </aside>
    </>
  );
}
