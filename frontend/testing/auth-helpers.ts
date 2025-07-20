import { mockGetCookie } from "./global-mocks";

export function clearAuthenticatedTest() {
	// Reset to no cookie
	mockGetCookie.mockReturnValue(null);
}

export function setupAuthenticatedTest() {
	// Set up a valid session cookie for authenticated requests
	mockGetCookie.mockReturnValue({
		name: "grantflow_session",
		value: "test-session-token",
	});
}
