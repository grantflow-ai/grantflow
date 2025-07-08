import { log } from "@/utils/logger";

export const healthHandlers = {
	health: async (): Promise<{ status: string; timestamp: string; version?: string }> => {
		log.info("[Mock API] Health check");

		return {
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: "mock-api-1.0.0",
		};
	},
};
