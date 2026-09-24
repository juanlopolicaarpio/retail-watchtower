import { pgTable, serial, varchar, text, boolean, integer, real, timestamp, uuid } from "drizzle-orm/pg-core";

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull().unique(),
  platform: varchar("platform", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  nameOverride: varchar("name_override", { length: 255 }),
  lastManualCheck: timestamp("last_manual_check"),
});

export const statusChecks = pgTable("status_checks", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id),
  isOnline: boolean("is_online").notNull(),
  checkedAt: timestamp("checked_at").defaultNow(),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
});

export const storeStatusHourly = pgTable("store_status_hourly", {
  effectiveAt: timestamp("effective_at").notNull(),
  platform: text("platform").notNull(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  status: text("status").notNull(),
  confidence: real("confidence").notNull(),
  responseMs: integer("response_ms"),
  evidence: text("evidence"),
  probeTime: timestamp("probe_time").notNull().defaultNow(),
  runId: uuid("run_id").notNull(),
});

export const statusSummaryHourly = pgTable("status_summary_hourly", {
  effectiveAt: timestamp("effective_at").primaryKey(),
  total: integer("total").notNull(),
  online: integer("online").notNull(),
  offline: integer("offline").notNull(),
  blocked: integer("blocked").notNull(),
  errors: integer("errors").notNull(),
  unknown: integer("unknown").notNull(),
  lastProbeAt: timestamp("last_probe_at").notNull().defaultNow(),
});

export const masterSkus = pgTable("master_skus", {
  id: serial("id").primaryKey(),
  skuCode: varchar("sku_code", { length: 50 }),
  productName: varchar("product_name", { length: 255 }),
  platform: varchar("platform", { length: 50 }),
  category: varchar("category", { length: 100 }),
  division: varchar("division", { length: 100 }),
  flowCategory: varchar("flow_category", { length: 100 }),
  gmvQ3: real("gmv_q3"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storeSkuChecks = pgTable("store_sku_checks", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id),
  platform: varchar("platform", { length: 50 }),
  checkDate: timestamp("check_date"),
  outOfStockSkus: text("out_of_stock_skus"),
  totalSkusChecked: integer("total_skus_checked"),
  outOfStockCount: integer("out_of_stock_count"),
  compliancePercentage: real("compliance_percentage"),
  checkedBy: varchar("checked_by", { length: 100 }),
  checkedAt: timestamp("checked_at").defaultNow(),
  notes: text("notes"),
});

export const storeRatings = pgTable("store_ratings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id),
  platform: varchar("platform", { length: 50 }),
  rating: real("rating"),
  scrapedAt: timestamp("scraped_at"),
  scraperRunId: varchar("scraper_run_id", { length: 100 }),
  ratingChange: real("rating_change"),
  previousRating: real("previous_rating"),
  manualEntry: boolean("manual_entry"),
  enteredBy: varchar("entered_by", { length: 100 }),
  notes: text("notes"),
});

export const currentStoreRatings = pgTable("current_store_ratings", {
  storeId: integer("store_id").references(() => stores.id),
  platform: varchar("platform", { length: 50 }),
  currentRating: real("current_rating"),
  lastScrapedAt: timestamp("last_scraped_at"),
  ratingTrend: varchar("rating_trend", { length: 20 }),
  trendValue: real("trend_value"),
});
