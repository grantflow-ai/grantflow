export class LoggingUtils {}

export function createGcpLoggingPinoConfig() {
	return {
		level: "info",
	};
}

export const instance = () => ({});
export const project = () => Promise.resolve("mock-project");
export const isAvailable = () => Promise.resolve(false);
export default {
	createGcpLoggingPinoConfig,
	instance,
	isAvailable,
	LoggingUtils,
	project,
};
