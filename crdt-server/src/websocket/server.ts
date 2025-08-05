import { Server } from "@hocuspocus/server";

import { config } from "@/config";
import { databaseExtension } from "@/websocket/database-extension";

export const server = new Server({
	extensions: [databaseExtension],
	name: config.CRDT_SERVER_NAME,
	port: config.PORT,
});
