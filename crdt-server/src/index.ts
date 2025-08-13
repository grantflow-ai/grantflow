import { Server } from "@hocuspocus/server";
import { databaseExtension } from "@/extensions/database-extension";
import { healthCheckExtension } from "@/extensions/health-check";
import { config } from "@/utils/config";
import { logger } from "@/utils/logger";

export const server = new Server({
	extensions: [databaseExtension, healthCheckExtension],
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

try {
	await server.listen();
	logger.info({ env: config.NODE_ENV, port: config.PORT }, "server_started");
} catch (error: unknown) {
	logger.error({ error: error instanceof Error ? error.message : JSON.stringify(error) }, "server startup failed");
	throw new Error("Server failed to start");
}
