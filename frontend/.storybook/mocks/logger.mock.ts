export class LoggingUtils {}

export function createGcpLoggingPinoConfig() {
	return {
		level: "info",
	};
}

export const instance = () => ({});
export const project = () => Promise.resolve("mock-project");
export const isAvailable = () => Promise.resolve(false);

const loggerMock = {
	createGcpLoggingPinoConfig,
	instance,
	isAvailable,
	LoggingUtils,
	project,
};

export default loggerMock;
