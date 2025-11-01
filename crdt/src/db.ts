import { drizzle } from "drizzle-orm/node-postgres";
import { customType, json, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { config } from "@/utils/config";

export const db = drizzle({
	connection: {
		connectionString: config.DATABASE_URL,
	},
});

// eslint-disable-next-line @typescript-eslint/unified-signatures
const bytea = customType<{ data: null | Uint8Array; driverData: Buffer | null }>({
	dataType() {
		return "bytea";
	},
	fromDriver(value: Buffer | null): null | Uint8Array {
		return value ? new Uint8Array(value) : null;
	},
	toDriver(value: null | Uint8Array): Buffer | null {
		return value ? Buffer.from(value) : null;
	},
});

export const editorDocuments = pgTable("editor_documents", {
	crdt: bytea("crdt"),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
	documentMetadata: json("document_metadata").default({}),
	grantApplicationId: uuid("grant_application_id"),
	id: uuid().primaryKey().notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).notNull(),
});
