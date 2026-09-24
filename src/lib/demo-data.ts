const checkedAt = "2026-09-23T03:30:00.000Z";

export const demoStores = [
  { id: 1, display_name: "Juniper Eats — BGC", name: "Juniper Eats — BGC", url: "https://example.com/stores/bgc", platform: "grabfood", is_online: true, checked_at: checkedAt, response_time_ms: 842, error_message: null, status: "ONLINE", confidence: 0.99 },
  { id: 2, display_name: "Juniper Eats — Makati", name: "Juniper Eats — Makati", url: "https://example.com/stores/makati", platform: "foodpanda", is_online: true, checked_at: checkedAt, response_time_ms: 915, error_message: null, status: "ONLINE", confidence: 0.98 },
  { id: 3, display_name: "Juniper Eats — Alabang", name: "Juniper Eats — Alabang", url: "https://example.com/stores/alabang", platform: "grabfood", is_online: false, checked_at: checkedAt, response_time_ms: 2_480, error_message: null, status: "OFFLINE", confidence: 0.96 },
  { id: 4, display_name: "Juniper Eats — Ortigas", name: "Juniper Eats — Ortigas", url: "https://example.com/stores/ortigas", platform: "foodpanda", is_online: true, checked_at: checkedAt, response_time_ms: 1_030, error_message: null, status: "ONLINE", confidence: 0.99 },
  { id: 5, display_name: "Juniper Eats — Quezon City", name: "Juniper Eats — Quezon City", url: "https://example.com/stores/quezon-city", platform: "grabfood", is_online: true, checked_at: checkedAt, response_time_ms: 788, error_message: null, status: "ONLINE", confidence: 0.99 },
  { id: 6, display_name: "Juniper Eats — Pasig", name: "Juniper Eats — Pasig", url: "https://example.com/stores/pasig", platform: "foodpanda", is_online: null, checked_at: checkedAt, response_time_ms: null, error_message: null, status: "BLOCKED", confidence: 0.72 },
  { id: 7, display_name: "Juniper Eats — Taguig", name: "Juniper Eats — Taguig", url: "https://example.com/stores/taguig", platform: "grabfood", is_online: true, checked_at: checkedAt, response_time_ms: 731, error_message: null, status: "ONLINE", confidence: 0.99 },
  { id: 8, display_name: "Juniper Eats — Mandaluyong", name: "Juniper Eats — Mandaluyong", url: "https://example.com/stores/mandaluyong", platform: "foodpanda", is_online: true, checked_at: checkedAt, response_time_ms: 884, error_message: null, status: "ONLINE", confidence: 0.98 },
];

export const demoSummary = {
  current: {
    total: "8", online: "6", offline: "1", blocked: "1", errors: "0", online_pct: "75.0",
    grabfood_total: "4", grabfood_online: "3", foodpanda_total: "4", foodpanda_online: "3",
    last_checked: checkedAt,
  },
  trend: [
    { day: "2026-09-17", online_pct: "88.0", online: "7", total: "8" },
    { day: "2026-09-18", online_pct: "91.0", online: "7", total: "8" },
    { day: "2026-09-19", online_pct: "94.0", online: "8", total: "8" },
    { day: "2026-09-20", online_pct: "86.0", online: "7", total: "8" },
    { day: "2026-09-21", online_pct: "92.0", online: "7", total: "8" },
    { day: "2026-09-22", online_pct: "89.0", online: "7", total: "8" },
    { day: "2026-09-23", online_pct: "75.0", online: "6", total: "8" },
  ],
};

const products = [
  { sku_code: "JNP-101", product_name: "Roasted Chicken Bowl", category: "Meals" },
  { sku_code: "JNP-204", product_name: "Mushroom Melt", category: "Sandwiches" },
  { sku_code: "JNP-310", product_name: "Citrus Iced Tea", category: "Drinks" },
];

export const demoSkuCompliance = demoStores.map((store, index) => {
  const outOfStock = index % 3 === 0 ? products.slice(0, 2) : index % 3 === 1 ? products.slice(0, 1) : [];
  return {
    id: store.id,
    display_name: store.display_name,
    platform: store.platform,
    url: store.url,
    compliance_percentage: 100 - outOfStock.length * 8.3,
    out_of_stock_count: outOfStock.length,
    total_skus_checked: 24,
    out_of_stock_skus: outOfStock,
    check_date: checkedAt,
    notes: outOfStock.length ? "Replenishment check required" : null,
  };
});

export const demoRatings = demoStores.map((store, index) => {
  const base = 4.9 - index * 0.06;
  const trend = index % 4 === 2 ? "down" : index % 3 === 0 ? "up" : "stable";
  return {
    id: store.id,
    display_name: store.display_name,
    platform: store.platform,
    current_rating: Number(base.toFixed(1)),
    last_scraped_at: checkedAt,
    rating_trend: trend,
    trend_value: trend === "up" ? 0.1 : trend === "down" ? -0.1 : 0,
    history: [0.04, 0.02, 0.01, 0].map((offset, day) => ({
      rating: Number((base - offset).toFixed(2)),
      scraped_at: `2026-09-${String(20 + day).padStart(2, "0")}T03:30:00.000Z`,
    })),
  };
});

export const demoLeaderboard = demoStores
  .map((store, index) => {
    const uptime = Number((99.4 - index * 1.1).toFixed(1));
    const compliance = demoSkuCompliance[index].compliance_percentage;
    return {
      id: store.id,
      display_name: store.display_name,
      platform: store.platform,
      uptime_pct: uptime,
      compliance_pct: compliance,
      current_rating: demoRatings[index].current_rating,
      perfect_score: Number(((uptime + compliance) / 2).toFixed(1)),
    };
  })
  .sort((a, b) => b.perfect_score - a.perfect_score);

export const demoUptime = demoLeaderboard.map(({ id, display_name, platform, uptime_pct }) => ({
  id,
  display_name,
  platform,
  total_checks: 168,
  online_checks: Math.round(168 * uptime_pct / 100),
  uptime_pct,
}));
