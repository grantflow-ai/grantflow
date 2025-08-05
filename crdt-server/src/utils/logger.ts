import {pino} from "pino";
import { config } from "@/config";

export const logger = pino({
	level: "info",
	transport:
		config.NODE_ENV === "development"
			? { options: { colorize: true }, target: "pino-pretty" }
			: undefined,
});
