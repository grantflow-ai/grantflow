import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CookiePreferencesModal } from "./cookie-preferences-modal";

describe("CookiePreferencesModal", () => {
	it("calls onCancel handler when Cancel button is clicked", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		fireEvent.click(screen.getByTestId("cookie-preferences-cancel"));

		expect(mockOnCancel).toHaveBeenCalledOnce();
		expect(mockOnSavePreferences).not.toHaveBeenCalled();
	});

	it("calls onSavePreferences handler with correct preferences when Save button is clicked", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		fireEvent.click(screen.getByTestId("cookie-preferences-save"));

		expect(mockOnSavePreferences).toHaveBeenCalledOnce();
		expect(mockOnSavePreferences).toHaveBeenCalledWith({ analytics: false });
		expect(mockOnCancel).not.toHaveBeenCalled();
	});

	it("calls onSavePreferences with analytics=true when analytics toggle is enabled", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		fireEvent.click(screen.getByTestId("analytics-cookies-switch"));

		fireEvent.click(screen.getByTestId("cookie-preferences-save"));

		expect(mockOnSavePreferences).toHaveBeenCalledOnce();
		expect(mockOnSavePreferences).toHaveBeenCalledWith({ analytics: true });
	});

	it("toggles analytics state correctly when analytics switch is clicked", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		const analyticsSwitch = screen.getByTestId("analytics-cookies-switch");

		expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");

		fireEvent.click(analyticsSwitch);
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "true");

		fireEvent.click(analyticsSwitch);
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
	});

	it("essential cookies switch is always checked and disabled", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		const essentialSwitch = screen.getByTestId("essential-cookies-switch");

		expect(essentialSwitch).toBeDisabled();
		expect(essentialSwitch).toHaveAttribute("aria-checked", "true");

		fireEvent.click(essentialSwitch);
		expect(mockOnCancel).not.toHaveBeenCalled();
		expect(mockOnSavePreferences).not.toHaveBeenCalled();
	});

	it("essential cookies switch remains checked after clicks", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		const essentialSwitch = screen.getByTestId("essential-cookies-switch");

		fireEvent.click(essentialSwitch);
		fireEvent.click(essentialSwitch);
		fireEvent.click(essentialSwitch);

		expect(essentialSwitch).toHaveAttribute("aria-checked", "true");
		expect(essentialSwitch).toBeDisabled();
	});

	it("renders modal when show is true", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		expect(screen.getByTestId("cookie-preferences-modal")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-preferences-cancel")).toBeInTheDocument();
		expect(screen.getByTestId("cookie-preferences-save")).toBeInTheDocument();
		expect(screen.getByTestId("essential-cookies-switch")).toBeInTheDocument();
		expect(screen.getByTestId("analytics-cookies-switch")).toBeInTheDocument();
	});

	it("does not render modal when show is false", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={false} />,
		);

		expect(screen.queryByTestId("cookie-preferences-modal")).not.toBeInTheDocument();
	});

	it("preserves analytics state changes across multiple interactions", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		const analyticsSwitch = screen.getByTestId("analytics-cookies-switch");

		fireEvent.click(analyticsSwitch);
		expect(analyticsSwitch).toHaveAttribute("aria-checked", "true");

		fireEvent.click(screen.getByTestId("cookie-preferences-cancel"));
		expect(mockOnSavePreferences).not.toHaveBeenCalled();

		expect(analyticsSwitch).toHaveAttribute("aria-checked", "true");
	});

	it("analytics state reflects in save preferences call after multiple toggles", () => {
		const mockOnCancel = vi.fn();
		const mockOnSavePreferences = vi.fn();

		render(
			<CookiePreferencesModal onCancel={mockOnCancel} onSavePreferences={mockOnSavePreferences} show={true} />,
		);

		const analyticsSwitch = screen.getByTestId("analytics-cookies-switch");

		fireEvent.click(analyticsSwitch);
		fireEvent.click(analyticsSwitch);
		fireEvent.click(analyticsSwitch);

		fireEvent.click(screen.getByTestId("cookie-preferences-save"));

		expect(mockOnSavePreferences).toHaveBeenCalledWith({ analytics: true });
	});
});
