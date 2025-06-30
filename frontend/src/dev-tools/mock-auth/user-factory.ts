import type { UserInfo } from "@/stores/user-store";

/**
 * Mock user data for development authentication bypass
 */
export const createMockUser = (overrides?: Partial<UserInfo>): UserInfo => {
	const defaultUser: UserInfo = {
		displayName: "Test User",
		email: "test@example.com",
		emailVerified: true,
		photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
		providerId: "google.com",
		uid: "mock-user-uid-123",
	};

	return {
		...defaultUser,
		...overrides,
	};
};

/**
 * Predefined mock users for different scenarios
 */
export const mockUsers = {
	emailUser: createMockUser({
		displayName: "Email Test User",
		email: "email.user@example.com",
		photoURL: null, // Firebase email provider ID
		providerId: "password",
		uid: "email-mock-uid",
	}),
	googleUser: createMockUser({
		displayName: "Google Test User",
		email: "google.user@gmail.com",
		providerId: "google.com",
		uid: "google-mock-uid",
	}),

	orcidUser: createMockUser({
		displayName: "Dr. Research Scientist",
		email: "researcher@university.edu",
		photoURL: null,
		providerId: "oidc.orcid",
		uid: "orcid-mock-uid", // ORCID users might not have photos
	}),
};

/**
 * Mock JWT token for development
 */
export const createMockJwtToken = (): string => {
	// This is a fake JWT for development only - not cryptographically valid
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = btoa(
		JSON.stringify({
			email: "test@example.com",
			exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
			iat: Math.floor(Date.now() / 1000),
			name: "Test User",
			sub: "mock-user-uid-123", // 7 days
		}),
	);
	const signature = "mock-signature";

	return `${header}.${payload}.${signature}`;
};
