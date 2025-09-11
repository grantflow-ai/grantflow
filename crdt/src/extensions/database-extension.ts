import { Database } from "@hocuspocus/extension-database";
import { eq } from "drizzle-orm";
import { db, editorDocuments } from "@/db";
import { logger } from "@/utils/logger";

export const databaseExtension = new Database({
	fetch: async ({ documentName }) => {
		try {
			const rows = await db
				.select({ crdt: editorDocuments.crdt })
				.from(editorDocuments)
				.where(eq(editorDocuments.id, documentName))
				.limit(1);

			const crdt = rows.length === 0 ? null : rows[0].crdt;
			logger.info({ documentId: documentName, hasCrdt: crdt !== null }, "crdt_state_fetched");
			return crdt;
		} catch (err) {
			logger.error({ documentId: documentName, err }, "crdt_state_fetch_failed");
			throw err;
		}
	},
	store: async ({ documentName, state }) => {
		try {
			await db.update(editorDocuments).set({ crdt: state }).where(eq(editorDocuments.id, documentName));
			logger.info({ documentId: documentName }, "crdt_state_persisted");
		} catch (err) {
			logger.error({ documentId: documentName, err }, "crdt_state_persist_failed");
			throw err;
		}
	},
});
