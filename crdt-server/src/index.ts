import { Server } from "@hocuspocus/server";
import { databaseExtension } from "@/database-extension";
import { config } from "@/utils/config";
import { logger } from "@/utils/logger";

export const server = new Server({
	extensions: [databaseExtension],
	name: "GrantFlow CRDT Server",
	onConnect: (data) => {
		logger.info({ documentName: data.documentName }, "ws_connect");
		return Promise.resolve();
	},
	onDisconnect: (data) => {
		logger.info({ documentName: data.documentName }, "ws_disconnect");
		return Promise.resolve();
	},
	port: config.PORT,
});
