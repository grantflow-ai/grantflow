import { mockGetCookie } from "./global-mocks";

export function clearAuthenticatedTest() {
	// Reset to no cookie - return undefined rather than null to avoid "cookie.value cannot be null" errors
	mockGetCookie.mockReturnValue(undefined);
}

export function setupAuthenticatedTest() {
	// Set up a valid session cookie for authenticated requests
	mockGetCookie.mockReturnValue({
		name: "grantflow_session",
		value: "test-session-token",
	});
}
