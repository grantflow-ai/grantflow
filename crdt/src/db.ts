import { drizzle } from "drizzle-orm/node-postgres";
import { json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { config } from "@/utils/config";

export const db = drizzle({
	connection: {
		connectionString: config.DATABASE_URL,
	},
});

export const editorDocuments = pgTable("editor_documents", {
	id: uuid().primaryKey().notNull(),
	crdt: text().$type<Uint8Array>().nullable(),
	documentMetadata: json("document_metadata").default({}),
	grantApplicationId: uuid("grant_application_id").nullable(),
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).notNull(),
	deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }).nullable(),
});