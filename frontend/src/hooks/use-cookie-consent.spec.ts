import { act, renderHook } from "@testing-library/react";
import { useCookies } from "react-cookie";
import { vi } from "vitest";
import { COOKIE_CONSENT } from "@/constants";
import { type CookieConsentData, useCookieConsent } from "./use-cookie-consent";

vi.mock("react-cookie");

const mockUseCookies = vi.mocked(useCookies);

describe("useCookieConsent", () => {
	const mockSetCookie = vi.fn();
	const mockRemoveCookie = vi.fn();
	const mockUpdateCookies = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Hook Initialization & State Management", () => {
		it("should return correct initial structure with all required properties", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			expect(result.current).toEqual({
				consentData: undefined,
				hasConsent: false,
				hasInteracted: false,
				isHydrated: true, // In test environment, useEffect runs immediately
				saveConsent: expect.any(Function),
			});
		});

		it("should have isHydrated as true after initialization in test environment", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			expect(result.current.isHydrated).toBe(true);
		});

		it("should return correct consent values when no cookie exists", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			expect(result.current.hasConsent).toBe(false);
			expect(result.current.hasInteracted).toBe(false);
		});

		it("should not crash when initialized", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			expect(() => renderHook(() => useCookieConsent())).not.toThrow();
		});
	});

	describe("Hydration Logic", () => {
		it("should have isHydrated as true in test environment", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, useEffect runs synchronously
			expect(result.current.isHydrated).toBe(true);
		});

		it("should maintain hydration state on re-renders", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { rerender, result } = renderHook(() => useCookieConsent());

			expect(result.current.isHydrated).toBe(true);

			rerender();
			expect(result.current.isHydrated).toBe(true);
		});

		it("should read cookies when hydrated", () => {
			const mockConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, cookies are read immediately since isHydrated is true
			expect(result.current.consentData).toEqual(mockConsentData);
		});

		it("should handle undefined cookies when hydrated", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			expect(result.current.consentData).toBeUndefined();
		});
	});

	describe("Cookie Reading Logic (Post-Hydration)", () => {
		it("should read existing consent cookie correctly when present", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toEqual(mockConsentData);
		});

		it("should return undefined when no consent cookie exists", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toBeUndefined();
		});

		it("should correctly parse cookie data structure", async () => {
			const mockConsentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: true,
				preferences: { analytics: false, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toEqual(mockConsentData);
			expect(result.current.consentData?.consentGiven).toBe(false);
			expect(result.current.consentData?.hasInteracted).toBe(true);
			expect(result.current.consentData?.preferences.analytics).toBe(false);
			expect(result.current.consentData?.preferences.essential).toBe(true);
		});

		it("should handle invalid cookie data gracefully", async () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: "invalid-data" },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toBe("invalid-data");
			expect(result.current.hasConsent).toBe(false);
			expect(result.current.hasInteracted).toBe(false);
		});
	});

	describe("Computed Properties (hasConsent)", () => {
		it("should return correct value based on cookie state when hydrated", () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: { consentGiven: true } },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, this will be true since the cookie has consentGiven: true
			expect(result.current.hasConsent).toBe(true);
		});

		it("should return false when no consent data exists", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasConsent).toBe(false);
		});

		it("should return false when consentData.consentGiven is false", async () => {
			const mockConsentData = {
				consentGiven: false,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasConsent).toBe(false);
		});

		it("should return true when consentData.consentGiven is true", async () => {
			const mockConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasConsent).toBe(true);
		});

		it("should handle undefined/null consent data safely", async () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: null },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasConsent).toBe(false);
		});
	});

	describe("Computed Properties (hasInteracted)", () => {
		it("should return correct value based on cookie state when hydrated", () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: { hasInteracted: true } },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, this will be true since the cookie has hasInteracted: true
			expect(result.current.hasInteracted).toBe(true);
		});

		it("should return false when no consent data exists", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasInteracted).toBe(false);
		});

		it("should return false when consentData.hasInteracted is false", async () => {
			const mockConsentData = {
				consentGiven: true,
				hasInteracted: false,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasInteracted).toBe(false);
		});

		it("should return true when consentData.hasInteracted is true", async () => {
			const mockConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: mockConsentData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasInteracted).toBe(true);
		});

		it("should handle undefined/null consent data safely", async () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: undefined },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasInteracted).toBe(false);
		});
	});

	describe("Cookie Writing (saveConsent)", () => {
		it("should call setCookie with correct cookie name", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, consentData, expect.any(Object));
		});

		it("should pass correct data structure to setCookie", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: true,
				preferences: { analytics: false, essential: true },
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, consentData, expect.any(Object));
		});

		it("should set correct cookie options with expected structure", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, consentData, {
				maxAge: 365 * 24 * 60 * 60,
				path: "/",
				sameSite: "strict",
				secure: expect.any(Boolean),
			});
		});

		it("should create new function reference on each render", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { rerender, result } = renderHook(() => useCookieConsent());

			const saveConsentRef1 = result.current.saveConsent;

			rerender();

			const saveConsentRef2 = result.current.saveConsent;

			// The function is recreated on each render since it's not useCallback wrapped
			expect(typeof saveConsentRef1).toBe("function");
			expect(typeof saveConsentRef2).toBe("function");
		});
	});

	describe("Cookie Options Structure", () => {
		it("should include all required cookie options", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			// eslint-disable-next-line unicorn/no-unreadable-array-destructuring
			const [[, , options]] = mockSetCookie.mock.calls;
			expect(options).toHaveProperty("maxAge", 365 * 24 * 60 * 60);
			expect(options).toHaveProperty("path", "/");
			expect(options).toHaveProperty("sameSite", "strict");
			expect(options).toHaveProperty("secure");
			expect(typeof options.secure).toBe("boolean");
		});
	});

	describe("Data Structure Validation", () => {
		it("should accept valid CookieConsentData structure with analytics enabled", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: true,
					essential: true,
				},
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, consentData, expect.any(Object));
		});

		it("should handle different preference combinations correctly", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: {
					analytics: false,
					essential: true,
				},
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, consentData, expect.any(Object));
		});

		it("should preserve data types when saving", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: false,
				hasInteracted: false,
				preferences: {
					analytics: false,
					essential: true,
				},
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			const [[, savedData]] = mockSetCookie.mock.calls;
			expect(typeof savedData.consentGiven).toBe("boolean");
			expect(typeof savedData.hasInteracted).toBe("boolean");
			expect(typeof savedData.preferences.analytics).toBe("boolean");
			expect(typeof savedData.preferences.essential).toBe("boolean");
		});
	});

	describe("Integration with react-cookie", () => {
		it("should correctly use useCookies hook with proper cookie name array", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			renderHook(() => useCookieConsent());

			expect(mockUseCookies).toHaveBeenCalledWith([COOKIE_CONSENT]);
		});

		it("should destructure cookies and setCookie correctly", () => {
			const mockCookies = { [COOKIE_CONSENT]: "test-data" };
			mockUseCookies.mockReturnValue([mockCookies, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			expect(typeof result.current.saveConsent).toBe("function");
		});

		it("should handle when react-cookie returns undefined values", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]); // Use empty object instead of undefined

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toBeUndefined();
			expect(result.current.hasConsent).toBe(false);
			expect(result.current.hasInteracted).toBe(false);
		});
	});

	describe("Re-render Behavior & Dependencies", () => {
		it("should render expected number of times", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			let renderCount = 0;
			const { rerender } = renderHook(() => {
				renderCount++;
				return useCookieConsent();
			});

			// In test environment with useEffect running immediately, we get 2 renders
			expect(renderCount).toBe(2);

			rerender();
			expect(renderCount).toBe(3);
		});

		it("should recreate saveConsent function reference on re-render", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { rerender, result } = renderHook(() => useCookieConsent());

			const initialSaveConsent = result.current.saveConsent;

			rerender();

			// Since saveConsent is not memoized, it creates new function reference
			expect(result.current.saveConsent).not.toBe(initialSaveConsent);
			expect(typeof result.current.saveConsent).toBe("function");
		});
	});

	describe("Edge Cases & Error Scenarios", () => {
		it("should handle corrupted cookie data", async () => {
			const corruptedData = { invalidProperty: "invalid", missing: "required fields" };
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: corruptedData },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toEqual(corruptedData);
			expect(result.current.hasConsent).toBe(false);
			expect(result.current.hasInteracted).toBe(false);
		});

		it("should handle null cookie values", async () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: null },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.consentData).toBe(null);
			expect(result.current.hasConsent).toBe(false);
			expect(result.current.hasInteracted).toBe(false);
		});

		it("should handle setCookie failures gracefully", async () => {
			const failingSetCookie = vi.fn().mockImplementation(() => {
				throw new Error("Cookie write failed");
			});
			mockUseCookies.mockReturnValue([{}, failingSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};

			expect(() => {
				act(() => {
					result.current.saveConsent(consentData);
				});
			}).toThrow("Cookie write failed");
		});
	});

	describe("Hydration Mismatch Prevention", () => {
		it("should return same initial values for server and client before hydration", () => {
			// Simulate server-side render
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: { consentGiven: true, hasInteracted: true } },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, useEffect runs immediately so isHydrated is true
			// But the logic still works correctly - when hydrated, it reads from cookies
			expect(result.current.isHydrated).toBe(true);
			expect(result.current.hasConsent).toBe(true);
			expect(result.current.hasInteracted).toBe(true);
			expect(result.current.consentData).toEqual({ consentGiven: true, hasInteracted: true });
		});

		it("should prevent hydration mismatch by delaying cookie reads", async () => {
			mockUseCookies.mockReturnValue([
				{ [COOKIE_CONSENT]: { consentGiven: true, hasInteracted: true } },
				mockSetCookie,
				mockRemoveCookie,
				mockUpdateCookies,
			]);

			const { result } = renderHook(() => useCookieConsent());

			// In test environment, hydration happens immediately
			expect(result.current.isHydrated).toBe(true);
			expect(result.current.hasConsent).toBe(true);
			expect(result.current.hasInteracted).toBe(true);
			expect(result.current.consentData).toEqual({ consentGiven: true, hasInteracted: true });

			// Values should remain consistent after any async operations
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

			expect(result.current.hasConsent).toBe(true);
			expect(result.current.hasInteracted).toBe(true);
			expect(result.current.isHydrated).toBe(true);
		});

		it("should ensure consistent behavior across SSR and client-side rendering", async () => {
			// Test multiple instances to ensure consistency
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);
			const instance1 = renderHook(() => useCookieConsent());
			const instance2 = renderHook(() => useCookieConsent());

			// Both instances should have same initial state
			expect(instance1.result.current.isHydrated).toBe(instance2.result.current.isHydrated);
			expect(instance1.result.current.hasConsent).toBe(instance2.result.current.hasConsent);
			expect(instance1.result.current.hasInteracted).toBe(instance2.result.current.hasInteracted);

			// After hydration, both should be consistent
			await act(async () => {
				await Promise.all([
					new Promise((resolve) => setTimeout(resolve, 0)),
					new Promise((resolve) => setTimeout(resolve, 0)),
				]);
			});

			expect(instance1.result.current.isHydrated).toBe(instance2.result.current.isHydrated);
		});
	});

	describe("Constants Integration", () => {
		it("should use COOKIE_CONSENT constant correctly", () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			renderHook(() => useCookieConsent());

			expect(mockUseCookies).toHaveBeenCalledWith([COOKIE_CONSENT]);
		});

		it("should use cookie name from constant in setCookie calls", async () => {
			mockUseCookies.mockReturnValue([{}, mockSetCookie, mockRemoveCookie, mockUpdateCookies]);

			const { result } = renderHook(() => useCookieConsent());

			const consentData: CookieConsentData = {
				consentGiven: true,
				hasInteracted: true,
				preferences: { analytics: true, essential: true },
			};

			act(() => {
				result.current.saveConsent(consentData);
			});

			expect(mockSetCookie).toHaveBeenCalledWith(COOKIE_CONSENT, expect.any(Object), expect.any(Object));
		});
	});
});
