import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";
import PostLogin from "./post-login";

// Mock the clipboard API
Object.defineProperty(navigator, "clipboard", {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined),
	},
	writable: true,
});

describe.sequential("PostLogin", () => {
	afterEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	it("renders the component with the correct heading and text", () => {
		render(<PostLogin />);

		const heading = screen.getByTestId("post-login-heading");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Desktop Required");

		const text = screen.getByTestId("post-login-text");
		expect(text).toBeInTheDocument();
	});

	it("calls clipboard.writeText on button click", async () => {
		render(<PostLogin />);

		const button = screen.getByTestId("post-login-copy-button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(globalThis.location.origin);
		});
	});
});
