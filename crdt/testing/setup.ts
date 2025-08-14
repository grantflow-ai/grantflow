import { afterAll, afterEach, beforeAll, vi } from "vitest";
import "./setup-env";
import "./setup-mocks";

/* eslint-disable no-console */
const originalConsole = {
	error: console.error,
	log: console.log,
	warn: console.warn,
};

beforeAll(() => {
	// Suppress console output during tests for cleaner test output
	vi.spyOn(console, "warn").mockImplementation(() => {
		// Intentionally empty
	});
	vi.spyOn(console, "error").mockImplementation(() => {
		// Intentionally empty
	});
	vi.spyOn(console, "log").mockImplementation(() => {
		// Intentionally empty
	});
});

afterEach(() => {
	vi.clearAllMocks();
	vi.clearAllTimers();
});

afterAll(() => {
	// Restore original console methods
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	console.log = originalConsole.log;
	vi.restoreAllMocks();
});
/* eslint-enable no-console */
