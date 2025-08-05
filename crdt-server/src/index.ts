import { logger } from "@/utils/logger";
import { server } from "@/websocket/server";

logger.info("Starting websocket server");
server.listen();