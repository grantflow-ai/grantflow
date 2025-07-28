import { mockGetCookie } from "./global-mocks";

export function clearAuthenticatedTest() {
	mockGetCookie.mockReturnValue(undefined);
}

export function setupAuthenticatedTest() {
	mockGetCookie.mockReturnValue({
		name: "grantflow_session",
		value: "test-session-token",
	});
}
