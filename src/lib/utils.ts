import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPlatform(platform: string) {
  if (platform === "grabfood") return "GrabFood";
  if (platform === "foodpanda") return "Foodpanda";
  return platform;
}

export function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "ONLINE": return "text-green-700 bg-green-50 border-green-200";
    case "OFFLINE": return "text-red-700 bg-red-50 border-red-200";
    case "BLOCKED": return "text-amber-700 bg-amber-50 border-amber-200";
    case "ERROR": return "text-orange-700 bg-orange-50 border-orange-200";
    default: return "text-gray-500 bg-gray-50 border-gray-200";
  }
}

export function getComplianceColor(pct: number) {
  if (pct >= 90) return "text-green-700";
  if (pct >= 70) return "text-amber-600";
  return "text-red-600";
}

export function getComplianceBg(pct: number) {
  if (pct >= 90) return "bg-green-50 border-green-200 text-green-700";
  if (pct >= 70) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

export function formatTimeAgo(date: Date | string | null) {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
