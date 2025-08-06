import { Database } from "@hocuspocus/extension-database";
import { eq } from "drizzle-orm";
import { db, editorDocuments } from "@/db";
import { logger } from "@/utils/logger";

export const databaseExtension = new Database({
	fetch: async ({ documentName }) => {
		const document = await db
			.select({ crdt: editorDocuments.crdt })
			.from(editorDocuments)
			.where(eq(editorDocuments.id, documentName))
			.limit(1)
			.then((rows) => rows[0] || null);
		if (!document.crdt) {
			return null;
		}

		return document.crdt;
	},
	store: async ({ documentName, state }) => {
		await db
			.update(editorDocuments)
			.set({ crdt: state })
			.where(eq(editorDocuments.id, documentName));

		logger.info(`Updated ${documentName}`);
	},
});
