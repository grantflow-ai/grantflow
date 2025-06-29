import { getMockAPIClient, isMockAPIEnabled } from "./client";
import { registerMockHandlers } from "./register";

let mockHandlersRegistered = false;

export async function withMockAPI<T>(
	realAction: () => Promise<T>,
	endpoint: string,
	options?: { body?: string; method?: string },
): Promise<T> {
	if (!isMockAPIEnabled()) {
		return realAction();
	}

	if (!mockHandlersRegistered) {
		registerMockHandlers();
		mockHandlersRegistered = true;
		console.log("[Mock API] Mock mode enabled");
	}

	const mockClient = getMockAPIClient();
	return mockClient.intercept<T>(endpoint, options);
}
