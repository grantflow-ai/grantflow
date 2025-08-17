import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCookieConsentStore } from "@/stores/cookie-consent-store";
import { CookieConsentTrigger } from "./cookie-consent-trigger";

describe("CookieConsentTrigger", () => {
	beforeEach(() => {
		useCookieConsentStore.setState({
			consentGiven: false,
			hasInteracted: false,
			preferences: {
				analytics: false,
				essential: true,
			},
			showConsentModal: false,
			showPreferencesModal: false,
		});
		vi.clearAllTimers();
	});

	it("should render children", () => {
		render(
			<CookieConsentTrigger>
				<div data-testid="child-content">Test Content</div>
			</CookieConsentTrigger>,
		);

		expect(screen.getByTestId("child-content")).toBeInTheDocument();
	});

	it("should trigger consent modal when mouse moves near target element", async () => {
		vi.useFakeTimers();

		render(
			<CookieConsentTrigger proximityThreshold={100} triggerElementTestId="login-button">
				<button data-testid="login-button" type="button">
					Login
				</button>
			</CookieConsentTrigger>,
		);

		const button = screen.getByTestId("login-button");
		const rect = button.getBoundingClientRect();

		vi.advanceTimersByTime(500);

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(true);
		});

		vi.useRealTimers();
	});

	it("should not trigger if user has already interacted", async () => {
		vi.useFakeTimers();
		useCookieConsentStore.setState({ hasInteracted: true });

		render(
			<CookieConsentTrigger proximityThreshold={100} triggerElementTestId="login-button">
				<button data-testid="login-button" type="button">
					Login
				</button>
			</CookieConsentTrigger>,
		);

		const button = screen.getByTestId("login-button");
		const rect = button.getBoundingClientRect();

		vi.advanceTimersByTime(500);

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(false);
		});

		vi.useRealTimers();
	});

	it("should not trigger if mouse is outside proximity threshold", async () => {
		vi.useFakeTimers();

		render(
			<CookieConsentTrigger proximityThreshold={50} triggerElementTestId="login-button">
				<button data-testid="login-button" type="button">
					Login
				</button>
			</CookieConsentTrigger>,
		);

		const button = screen.getByTestId("login-button");
		const rect = button.getBoundingClientRect();

		vi.advanceTimersByTime(500);

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2 + 100,
			clientY: rect.top + rect.height / 2 + 100,
		});

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(false);
		});

		vi.useRealTimers();
	});

	it("should only trigger once", async () => {
		vi.useFakeTimers();
		const checkAndShowConsent = vi.fn();
		useCookieConsentStore.setState({ checkAndShowConsent });

		render(
			<CookieConsentTrigger proximityThreshold={100} triggerElementTestId="login-button">
				<button data-testid="login-button" type="button">
					Login
				</button>
			</CookieConsentTrigger>,
		);

		const button = screen.getByTestId("login-button");
		const rect = button.getBoundingClientRect();

		vi.advanceTimersByTime(500);

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});

		await waitFor(() => {
			expect(checkAndShowConsent).toHaveBeenCalledTimes(1);
		});

		vi.useRealTimers();
	});

	it("should find elements with login in data-testid when no specific testId provided", async () => {
		vi.useFakeTimers();

		render(
			<CookieConsentTrigger proximityThreshold={100}>
				<button data-testid="submit-login" type="button">
					Login
				</button>
			</CookieConsentTrigger>,
		);

		const button = screen.getByTestId("submit-login");
		const rect = button.getBoundingClientRect();

		vi.advanceTimersByTime(500);

		fireEvent.mouseMove(document, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		});

		await waitFor(() => {
			const state = useCookieConsentStore.getState();
			expect(state.showConsentModal).toBe(true);
		});

		vi.useRealTimers();
	});

	it("should cleanup event listener on unmount", () => {
		vi.useFakeTimers();
		const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

		const { unmount } = render(
			<CookieConsentTrigger>
				<div>Content</div>
			</CookieConsentTrigger>,
		);

		vi.advanceTimersByTime(500);
		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

		removeEventListenerSpy.mockRestore();
		vi.useRealTimers();
	});
});
