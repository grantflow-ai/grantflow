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
	vi.spyOn(console, "warn").mockImplementation(() => {
		// ~keep Intentionally empty
	});
	vi.spyOn(console, "error").mockImplementation(() => {
		// ~keep Intentionally empty
	});
	vi.spyOn(console, "log").mockImplementation(() => {
		// ~keep Intentionally empty
	});
});

afterEach(() => {
	vi.clearAllMocks();
	vi.clearAllTimers();
});

afterAll(() => {
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	console.log = originalConsole.log;
	vi.restoreAllMocks();
});
/* eslint-enable no-console */
