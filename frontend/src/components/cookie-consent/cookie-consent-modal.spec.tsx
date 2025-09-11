import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CookieConsentModal } from "./cookie-consent-modal";

describe("CookieConsentModal", () => {
	it("calls onAcceptAll handler when Accept All button is clicked", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={true} />);

		fireEvent.click(screen.getByTestId("cookie-consent-accept-all"));

		expect(mockOnAcceptAll).toHaveBeenCalledOnce();
		expect(mockOnCustomize).not.toHaveBeenCalled();
	});

	it("calls onCustomize handler when Customize button is clicked", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={true} />);

		fireEvent.click(screen.getByTestId("cookie-consent-customize"));

		expect(mockOnCustomize).toHaveBeenCalledOnce();
		expect(mockOnAcceptAll).not.toHaveBeenCalled();
	});

	it("renders modal when show is true", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={true} />);

		expect(screen.getByTestId("cookie-consent-modal")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-consent-accept-all")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-consent-customize")).toBeInTheDocument();
	});

	it("does not render modal when show is false", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={false} />);

		expect(screen.queryByTestId("cookie-consent-modal")).not.toBeInTheDocument();
	});

	it("prevents modal dismissal on escape key", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={true} />);

		const modal = screen.getByTestId("cookie-consent-modal");
		const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });

		fireEvent.keyDown(modal, escapeEvent);

		expect(screen.getByTestId("cookie-consent-modal")).toBeInTheDocument();
		expect(mockOnAcceptAll).not.toHaveBeenCalled();
		expect(mockOnCustomize).not.toHaveBeenCalled();
	});

	it("prevents modal dismissal on outside interaction", () => {
		const mockOnAcceptAll = vi.fn();
		const mockOnCustomize = vi.fn();

		render(<CookieConsentModal onAcceptAll={mockOnAcceptAll} onCustomize={mockOnCustomize} show={true} />);

		fireEvent.click(document.body);

		expect(screen.getByTestId("cookie-consent-modal")).toBeInTheDocument();
		expect(mockOnAcceptAll).not.toHaveBeenCalled();
		expect(mockOnCustomize).not.toHaveBeenCalled();
	});
});
