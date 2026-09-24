import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const g = globalThis as unknown as { _pgClient?: postgres.Sql };
const connectionString = process.env.DATABASE_URL;

if (connectionString && !g._pgClient) {
  g._pgClient = postgres(connectionString, { prepare: false, max: 5 });
}

// Routes return synthetic fixtures when DATABASE_URL is absent. The cast keeps
// the production query layer strongly typed without opening a demo connection.
export const db = g._pgClient
  ? drizzle(g._pgClient)
  : (null as unknown as ReturnType<typeof drizzle>);
