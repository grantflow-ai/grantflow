import type { onRequestPayload } from "@hocuspocus/server";
import type { ServerResponse } from "node:http";
import { db } from "@/db";
import { logger } from "@/utils/logger";

export interface HealthStatus {
	status: "healthy" | "unhealthy";
	timestamp: string;
	version?: string;
}

export interface ReadinessStatus extends HealthStatus {
	checks: {
		database: "healthy" | "unhealthy";
	};
}

export class HealthCheckExtension {
	extensionName = "HealthCheckExtension";

	async onRequest({ request, response }: onRequestPayload): Promise<void> {
		const url = new URL(request.url ?? "", `http://${request.headers.host ?? "localhost"}`);
		
		if (url.pathname === "/health") {
			this.handleHealthCheck(response);
			throw new Error("Health check handled");
		}
		
		if (url.pathname === "/ready") {
			await this.handleReadinessCheck(response);
			throw new Error("Readiness check handled");
		}
	}

	private handleHealthCheck(response: ServerResponse): void {
		response.writeHead(200, { 
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"Content-Type": "text/plain",
		});
		response.end("OK");
		
		logger.debug("health_check_success");
	}

	private async handleReadinessCheck(response: ServerResponse): Promise<void> {
		let isReady = false;
		
		try {
			await db.select().from({ dummy: "information_schema.tables" }).limit(1);
			isReady = true;
		} catch (error) {
			logger.error({ error: error instanceof Error ? error.message : String(error) }, "database_health_check_failed");
		}

		const statusCode = isReady ? 200 : 503;
		response.writeHead(statusCode, { 
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"Content-Type": "text/plain",
		});
		response.end(isReady ? "OK" : "NOT READY");
		
		logger.debug({ ready: isReady }, "readiness_check_completed");
	}
}