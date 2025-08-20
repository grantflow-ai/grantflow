// No-op mock for GCP logging modules to prevent loading in Storybook

// Mock for google-logging-utils
export class LoggingUtils {}

// Mock for @google-cloud/pino-logging-gcp-config
export function createGcpLoggingPinoConfig() {
	return {
		level: "info",
	};
}

// Mock for gcp-metadata
export const instance = () => ({});
export const project = () => Promise.resolve("mock-project");
export const isAvailable = () => Promise.resolve(false);

// Default exports for different modules
export default {
	createGcpLoggingPinoConfig,
	instance,
	isAvailable,
	LoggingUtils,
	project,
};
