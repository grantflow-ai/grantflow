import { act, renderHook } from "@testing-library/react";
import { updateEmail, updateProfile } from "firebase/auth";
import type { UserInfo } from "@/types/user";
import { createUserInfo, deleteProfilePhoto, getFirebaseAuth, uploadProfilePhoto } from "@/utils/firebase";

import { useUserStore } from "./user-store";

vi.mock("zustand/middleware", () => ({
	devtools: (fn: any) => fn,
	persist: (fn: any, _options: any) => fn,
}));

vi.mock("@/utils/firebase", () => ({
	createUserInfo: vi.fn((data) => ({
		customClaims: null,
		disabled: false,
		displayName: data.displayName ?? null,
		email: data.email ?? null,
		emailVerified: data.emailVerified ?? false,
		phoneNumber: data.phoneNumber ?? null,
		photoURL: data.photoURL ?? null,
		providerData: data.providerId
			? [
					{
						displayName: data.displayName ?? null,
						email: data.email ?? null,
						phoneNumber: data.phoneNumber ?? null,
						photoURL: data.photoURL ?? null,
						providerId: data.providerId,
						uid: data.uid,
					},
				]
			: [],
		tenantId: null,
		uid: data.uid,
	})),
	deleteProfilePhoto: vi.fn(),
	getFirebaseAuth: vi.fn(),
	uploadProfilePhoto: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
	updateEmail: vi.fn(),
	updateProfile: vi.fn(),
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

	describe("Profile update methods", () => {
		const mockCurrentUser = { uid: "test-uid-123" };

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(getFirebaseAuth).mockReturnValue({
				currentUser: mockCurrentUser,
			} as any);

			act(() => {
				useUserStore.getState().setUser(mockUser);
			});
		});

		describe("updateDisplayName", () => {
			it("updates display name successfully", async () => {
				const { result } = renderHook(() => useUserStore());
				const newDisplayName = "Jane Smith";

				vi.mocked(updateProfile).mockResolvedValueOnce(undefined);

				await act(async () => {
					await result.current.updateDisplayName(newDisplayName);
				});

				expect(updateProfile).toHaveBeenCalledWith(mockCurrentUser, { displayName: newDisplayName });
				expect(result.current.user?.displayName).toBe(newDisplayName);
			});

			it("throws error when no authenticated user", async () => {
				vi.mocked(getFirebaseAuth).mockReturnValue({ currentUser: null } as any);
				const { result } = renderHook(() => useUserStore());

				await expect(
					act(async () => {
						await result.current.updateDisplayName("New Name");
					}),
				).rejects.toThrow("No authenticated user");
			});

			it("throws error when update fails", async () => {
				const { result } = renderHook(() => useUserStore());
				const error = new Error("Update failed");

				vi.mocked(updateProfile).mockRejectedValueOnce(error);

				await expect(
					act(async () => {
						await result.current.updateDisplayName("New Name");
					}),
				).rejects.toThrow(error);
			});
		});

		describe("updateEmail", () => {
			it("updates email successfully", async () => {
				const { result } = renderHook(() => useUserStore());
				const newEmail = "jane.smith@example.com";

				vi.mocked(updateEmail).mockResolvedValueOnce(undefined);

				await act(async () => {
					await result.current.updateEmail(newEmail);
				});

				expect(updateEmail).toHaveBeenCalledWith(mockCurrentUser, newEmail);
				expect(result.current.user?.email).toBe(newEmail);
			});

			it("throws error when no authenticated user", async () => {
				vi.mocked(getFirebaseAuth).mockReturnValue({ currentUser: null } as any);
				const { result } = renderHook(() => useUserStore());

				await expect(
					act(async () => {
						await result.current.updateEmail("new@example.com");
					}),
				).rejects.toThrow("No authenticated user");
			});

			it("throws error when update fails", async () => {
				const { result } = renderHook(() => useUserStore());
				const error = new Error("auth/requires-recent-login");

				vi.mocked(updateEmail).mockRejectedValueOnce(error);

				await expect(
					act(async () => {
						await result.current.updateEmail("new@example.com");
					}),
				).rejects.toThrow(error);
			});
		});

		describe("updateProfilePhoto", () => {
			it("uploads profile photo successfully", async () => {
				const { result } = renderHook(() => useUserStore());
				const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
				const newPhotoURL = "https://example.com/new-photo.jpg";

				vi.mocked(uploadProfilePhoto).mockResolvedValueOnce(newPhotoURL);

				await act(async () => {
					await result.current.updateProfilePhoto(mockFile);
				});

				expect(uploadProfilePhoto).toHaveBeenCalledWith(mockCurrentUser, mockFile);
				expect(result.current.user?.photoURL).toBe(newPhotoURL);
			});

			it("throws error when no authenticated user", async () => {
				vi.mocked(getFirebaseAuth).mockReturnValue({ currentUser: null } as any);
				const { result } = renderHook(() => useUserStore());
				const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });

				await expect(
					act(async () => {
						await result.current.updateProfilePhoto(mockFile);
					}),
				).rejects.toThrow("No authenticated user");
			});

			it("throws error when upload fails", async () => {
				const { result } = renderHook(() => useUserStore());
				const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
				const error = new Error("Upload failed");

				vi.mocked(uploadProfilePhoto).mockRejectedValueOnce(error);

				await expect(
					act(async () => {
						await result.current.updateProfilePhoto(mockFile);
					}),
				).rejects.toThrow(error);
			});
		});

		describe("deleteProfilePhoto", () => {
			it("deletes profile photo successfully", async () => {
				const { result } = renderHook(() => useUserStore());

				vi.mocked(deleteProfilePhoto).mockResolvedValueOnce(undefined);

				await act(async () => {
					await result.current.deleteProfilePhoto();
				});

				expect(deleteProfilePhoto).toHaveBeenCalledWith(mockCurrentUser);
				expect(result.current.user?.photoURL).toBeNull();
			});

			it("throws error when no authenticated user", async () => {
				vi.mocked(getFirebaseAuth).mockReturnValue({ currentUser: null } as any);
				const { result } = renderHook(() => useUserStore());

				await expect(
					act(async () => {
						await result.current.deleteProfilePhoto();
					}),
				).rejects.toThrow("No authenticated user");
			});

			it("throws error when deletion fails", async () => {
				const { result } = renderHook(() => useUserStore());
				const error = new Error("Delete failed");

				vi.mocked(deleteProfilePhoto).mockRejectedValueOnce(error);

				await expect(
					act(async () => {
						await result.current.deleteProfilePhoto();
					}),
				).rejects.toThrow(error);
			});
		});
	});
});
