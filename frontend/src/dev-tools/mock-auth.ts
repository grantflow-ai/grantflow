import { useUserStore } from "@/stores/user-store";
import { createUserInfo } from "@/utils/firebase";

export function initializeMockAuth(): void {
	if (!isMockAuthEnabled()) {
		return;
	}

	// Set mock user data
	useUserStore.getState().setUser(
		createUserInfo({
			displayName: "Test User",
			email: "test@example.com",
			emailVerified: true,
			photoURL: null,
			providerId: "mock",
			uid: "mock-user-123",
		}),
	);

	// Mark welcome modal as seen to avoid blocking tests
	useUserStore.getState().dismissWelcomeModal();
}

export function isMockAuthEnabled(): boolean {
	const val = process.env.NEXT_PUBLIC_MOCK_AUTH;
	if (typeof val === "string") {
		return val.toLowerCase() === "true";
	}
	return false;
}
