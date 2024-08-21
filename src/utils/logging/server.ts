/* server logger */
import pinoHttp from "pino-http";

import { getEnv } from "@/utils/env";

export const serverLogger = pinoHttp({
	level: getEnv().NEXT_PUBLIC_DEBUG ? "debug" : "info",
	transport:
		process.env.NODE_ENV === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
					},
				}
			: undefined,
}).logger;
