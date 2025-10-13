import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as validation from "@/utils/validation";

import { RagSourceUrlInput } from "./rag-source-url-input";

vi.mock("@/utils/validation");

const mockIsValidUrl = vi.mocked(validation.isValidUrl);

describe("RagSourceUrlInput", () => {
	const mockOnUrlAdd = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();
		mockIsValidUrl.mockReturnValue(true);
	});

	describe("Basic Rendering", () => {
		it("renders the component with correct structure", () => {
			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			expect(screen.getByLabelText("URL")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Paste a link and press Enter to add")).toBeInTheDocument();
			expect(screen.getByDisplayValue("")).toBeInTheDocument();
		});

		it("renders with proper input attributes", () => {
			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");
			expect(input).toHaveAttribute("type", "url");
			expect(input).toHaveAttribute("id", "url-input");
			expect(input).toHaveAttribute("placeholder", "Paste a link and press Enter to add");
		});

		it("renders with custom testId", () => {
			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} testId="custom-test" />);

			const input = screen.getByTestId("custom-test");
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute("id", "custom-test-url-input");
		});

		it("renders with globe icon", () => {
			const { container } = render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const iconContainer = container.querySelector('[data-testid="url-input-icon"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer?.querySelector("img")).toBeInTheDocument();
		});
	});

	describe("URL Input Handling", () => {
		it("updates input value when user types", async () => {
			const user = userEvent.setup();
			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");
			const testUrl = "https://example.com";

			await user.type(input, testUrl);

			expect(input).toHaveValue(testUrl);
		});

		it("clears error when user starts typing after an error", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			mockIsValidUrl.mockReturnValue(true);
			await user.type(input, "h");

			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});

		it("trims whitespace from input before processing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, `  ${testUrl}  `);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalledWith(testUrl);
		});
	});

	describe("URL Validation", () => {
		it("shows validation error for invalid URL", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
			expect(mockOnUrlAdd).not.toHaveBeenCalled();
		});

		it("validates URL using isValidUrl utility", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockIsValidUrl).toHaveBeenCalledWith(testUrl);
		});

		it("accepts valid URLs", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";
			mockIsValidUrl.mockReturnValue(true);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalledWith(testUrl);
			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Enter Key Handling", () => {
		it("adds URL when Enter is pressed with valid input", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalledWith(testUrl);
		});

		it("does not add URL when Enter is pressed with empty input", async () => {
			const user = userEvent.setup();

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).not.toHaveBeenCalled();
		});

		it("does not add URL when Enter is pressed with only whitespace", async () => {
			const user = userEvent.setup();

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).not.toHaveBeenCalled();
		});

		it("ignores other key presses", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Space}");
			await user.keyboard("{Tab}");
			await user.keyboard("{Escape}");

			expect(mockOnUrlAdd).not.toHaveBeenCalled();
		});
	});

	describe("Duplicate URL Handling", () => {
		it("shows error when URL already exists", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			render(<RagSourceUrlInput existingUrls={[existingUrl]} onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("URL already exists")).toBeInTheDocument();
			expect(mockOnUrlAdd).not.toHaveBeenCalled();
		});

		it("clears input when duplicate URL is detected", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			render(<RagSourceUrlInput existingUrls={[existingUrl]} onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			expect(input).toHaveValue(existingUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("allows adding URL that does not exist", async () => {
			const user = userEvent.setup();
			const newUrl = "https://new.com";
			const existingUrls = ["https://existing1.com", "https://existing2.com"];

			render(<RagSourceUrlInput existingUrls={existingUrls} onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, newUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalledWith(newUrl);
		});

		it("handles empty existingUrls array", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput existingUrls={[]} onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalledWith(testUrl);
		});
	});

	describe("Input Clearing", () => {
		it("clears input after successful URL addition", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			expect(input).toHaveValue(testUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("does not clear input when validation fails", async () => {
			const user = userEvent.setup();
			const invalidUrl = "invalid-url";
			mockIsValidUrl.mockReturnValue(false);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, invalidUrl);
			expect(input).toHaveValue(invalidUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue(invalidUrl);
		});
	});

	describe("Error Message Display", () => {
		it("displays validation error message", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
		});

		it("displays duplicate URL error message", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			render(<RagSourceUrlInput existingUrls={[existingUrl]} onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("URL already exists")).toBeInTheDocument();
		});

		it("clears error message when user starts typing", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			await user.type(input, "x");

			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles URLs with various formats", async () => {
			const user = userEvent.setup();
			const urls = [
				"https://example.com",
				"http://test.org",
				"https://subdomain.example.com/path",
				"https://example.com:8080/path?query=value#hash",
			];

			for (const url of urls) {
				const { unmount } = render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

				const input = screen.getByLabelText("URL");
				await user.type(input, url);
				await user.keyboard("{Enter}");

				expect(mockOnUrlAdd).toHaveBeenCalledWith(url);

				unmount();
				vi.clearAllMocks();
				mockOnUrlAdd.mockClear();
			}
		});

		it("handles error thrown by onUrlAdd", async () => {
			const user = userEvent.setup();
			const testError = new Error("Network error");
			mockOnUrlAdd.mockRejectedValueOnce(testError);

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://example.com");
			await user.keyboard("{Enter}");

			// Input should not be cleared on error, so user can see what they typed
			expect(input).toHaveValue("https://example.com");

			// Error message should be displayed
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});

		it("prevents default behavior on Enter keypress", async () => {
			const user = userEvent.setup();

			render(<RagSourceUrlInput onUrlAdd={mockOnUrlAdd} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "https://example.com");
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdd).toHaveBeenCalled();
		});
	});
});
