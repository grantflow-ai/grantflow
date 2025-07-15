import { act, renderHook } from "@testing-library/react";
import type { UserInfo } from "@/types/user";
import { createUserInfo } from "@/utils/firebase";

import { useUserStore } from "./user-store";

vi.mock("zustand/middleware", () => ({
	devtools: (fn: any) => fn,
	persist: (fn: any, _options: any) => fn,
}));

const mockUser: UserInfo = createUserInfo({
	displayName: "John Doe",
	email: "john.doe@example.com",
	emailVerified: true,
	photoURL: "https://example.com/photo.jpg",
	providerId: "google.com",
	uid: "test-uid-123",
});

describe("useUserStore", () => {
	beforeEach(() => {
		act(() => {
			useUserStore.getState().clearUser();
		});
	});

	it("has correct initial state", () => {
		const { result } = renderHook(() => useUserStore());

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.hasSeenWelcomeModal).toBe(false);
	});

	it("sets user and authentication state", () => {
		const { result } = renderHook(() => useUserStore());

		act(() => {
			result.current.setUser(mockUser);
		});

		expect(result.current.user).toEqual(mockUser);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.hasSeenWelcomeModal).toBe(false);
	});

	it("clears user and resets authentication state", () => {
		const { result } = renderHook(() => useUserStore());

		act(() => {
			result.current.setUser(mockUser);
			result.current.dismissWelcomeModal();
		});

		expect(result.current.user).toEqual(mockUser);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.hasSeenWelcomeModal).toBe(true);

		act(() => {
			result.current.clearUser();
		});

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.hasSeenWelcomeModal).toBe(false);
	});

	it("handles null user when setting", () => {
		const { result } = renderHook(() => useUserStore());

		act(() => {
			result.current.setUser(mockUser);
		});

		expect(result.current.isAuthenticated).toBe(true);

		act(() => {
			result.current.setUser(null);
		});

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("dismisses welcome modal", () => {
		const { result } = renderHook(() => useUserStore());

		expect(result.current.hasSeenWelcomeModal).toBe(false);

		act(() => {
			result.current.dismissWelcomeModal();
		});

		expect(result.current.hasSeenWelcomeModal).toBe(true);
	});

	it("maintains welcome modal state independently of user state", () => {
		const { result } = renderHook(() => useUserStore());

		act(() => {
			result.current.dismissWelcomeModal();
		});

		expect(result.current.hasSeenWelcomeModal).toBe(true);
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.user).toBeNull();

		act(() => {
			result.current.setUser(mockUser);
		});

		expect(result.current.hasSeenWelcomeModal).toBe(true);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toEqual(mockUser);
	});

	it("handles user with minimal properties", () => {
		const { result } = renderHook(() => useUserStore());

		const minimalUser = createUserInfo({
			displayName: null,
			email: "minimal@example.com",
			emailVerified: false,
			photoURL: null,
			uid: "minimal-uid",
		});

		act(() => {
			result.current.setUser(minimalUser);
		});

		expect(result.current.user).toEqual(minimalUser);
		expect(result.current.isAuthenticated).toBe(true);
	});

	it("authentication state reflects user presence", () => {
		const { result } = renderHook(() => useUserStore());

		expect(result.current.isAuthenticated).toBe(false);

		act(() => {
			result.current.setUser(mockUser);
		});
		expect(result.current.isAuthenticated).toBe(true);

		act(() => {
			result.current.setUser(
				createUserInfo({
					displayName: null,
					email: null,
					emailVerified: false,
					photoURL: null,
					uid: "test",
				}),
			);
		});
		expect(result.current.isAuthenticated).toBe(true);

		act(() => {
			result.current.setUser(null);
		});
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("multiple actions can be performed in sequence", () => {
		const { result } = renderHook(() => useUserStore());

		act(() => {
			result.current.setUser(mockUser);

			result.current.dismissWelcomeModal();
		});

		expect(result.current.user).toEqual(mockUser);
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.hasSeenWelcomeModal).toBe(true);

		act(() => {
			result.current.setUser({ ...mockUser, displayName: "Jane Smith" });
		});

		expect(result.current.user?.displayName).toBe("Jane Smith");
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.hasSeenWelcomeModal).toBe(true);

		act(() => {
			result.current.clearUser();
		});

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.hasSeenWelcomeModal).toBe(false);
	});
});
