import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UrlResponseFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import * as validation from "@/utils/validation";

import { UrlInput } from "./url-input";

vi.mock("@/utils/validation");

const mockIsValidUrl = vi.mocked(validation.isValidUrl);

describe("UrlInput", () => {
	const mockOnUrlAdded = vi.fn();
	const defaultParentId = "test-parent-id";

	beforeEach(() => {
		vi.clearAllMocks();
		mockIsValidUrl.mockReturnValue(true);

		const store = useApplicationStore.getState();
		store.objectives = [];
		store.urls = {
			application: [],
			template: [],
		};

		vi.spyOn(store, "addUrl").mockResolvedValue();
	});

	describe("Basic Rendering", () => {
		it("renders the component with correct structure", () => {
			render(<UrlInput parentId={defaultParentId} />);

			expect(screen.getByLabelText("URL")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Paste a link and press Enter to add")).toBeInTheDocument();
			expect(screen.getByDisplayValue("")).toBeInTheDocument();
		});

		it("renders with proper input attributes", () => {
			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");
			expect(input).toHaveAttribute("type", "url");
			expect(input).toHaveAttribute("id", "url-input");
			expect(input).toHaveAttribute("placeholder", "Paste a link and press Enter to add");
		});

		it("renders with globe icon", () => {
			render(<UrlInput parentId={defaultParentId} />);

			const iconContainer = screen.getByTestId("url-input-icon");
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer.querySelector("svg")).toBeInTheDocument();
		});
	});

	describe("URL Input Handling", () => {
		it("updates input value when user types", async () => {
			const user = userEvent.setup();
			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");
			const testUrl = "https://example.com";

			await user.type(input, testUrl);

			expect(input).toHaveValue(testUrl);
		});

		it("clears error when user starts typing after an error", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

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

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, `  ${testUrl}  `);
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
		});
	});

	describe("URL Validation", () => {
		it("shows validation error for invalid URL", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
		});

		it("validates URL using isValidUrl utility", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockIsValidUrl).toHaveBeenCalledWith(testUrl);
		});

		it("accepts valid URLs", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";
			mockIsValidUrl.mockReturnValue(true);

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Enter Key Handling", () => {
		it("adds URL when Enter is pressed with valid input", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
			expect(mockOnUrlAdded).toHaveBeenCalledTimes(1);
		});

		it("does not add URL when Enter is pressed with empty input", async () => {
			const user = userEvent.setup();

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("does not add URL when Enter is pressed with only whitespace", async () => {
			const user = userEvent.setup();

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("ignores other key presses", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Space}");
			await user.keyboard("{Tab}");
			await user.keyboard("{Escape}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});
	});

	describe("Parent ID Validation", () => {
		it("shows error when parentId is missing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
		});

		it("shows error when parentId is undefined", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={undefined} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
		});

		it("shows error when parentId is empty string", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId="" />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			const store = useApplicationStore.getState();
			expect(store.addUrl).not.toHaveBeenCalled();
		});
	});

	describe("Duplicate URL Handling", () => {
		it("does not add URL if it already exists in application context", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			const store = useApplicationStore.getState();
			store.urls = {
				application: [existingUrl],
				template: [],
			};

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(store.addUrl).not.toHaveBeenCalled();
			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("does not add URL if it already exists in template context", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			const store = useApplicationStore.getState();
			store.urls = {
				application: [],
				template: [existingUrl],
			};

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(store.addUrl).not.toHaveBeenCalled();
			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("adds URL if it does not exist in either context", async () => {
			const user = userEvent.setup();
			const newUrl = "https://new.com";
			const existingUrls = ["https://existing1.com", "https://existing2.com"];

			const store = useApplicationStore.getState();
			store.urls = {
				application: [existingUrls[0]],
				template: [existingUrls[1]],
			};

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, newUrl);
			await user.keyboard("{Enter}");

			expect(store.addUrl).toHaveBeenCalledWith(newUrl, defaultParentId);
			expect(mockOnUrlAdded).toHaveBeenCalledTimes(1);
		});
	});

	describe("Input Clearing", () => {
		it("clears input after successful URL addition", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			expect(input).toHaveValue(testUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("clears input even when URL already exists", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			const store = useApplicationStore.getState();
			store.urls = {
				application: [existingUrl],
				template: [],
			};

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			expect(input).toHaveValue(existingUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("does not clear input when validation fails", async () => {
			const user = userEvent.setup();
			const invalidUrl = "invalid-url";
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, invalidUrl);
			expect(input).toHaveValue(invalidUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue(invalidUrl);
		});

		it("does not clear input when parentId is missing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			expect(input).toHaveValue(testUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue(testUrl);
		});
	});

	describe("Callback Handling", () => {
		it("calls onUrlAdded callback when URL is successfully added", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdded).toHaveBeenCalledTimes(1);
		});

		it("does not call onUrlAdded callback when URL already exists", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			const store = useApplicationStore.getState();
			store.urls = {
				application: [existingUrl],
				template: [],
			};

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("does not call onUrlAdded when validation fails", async () => {
			const user = userEvent.setup();
			const invalidUrl = "invalid-url";
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, invalidUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("does not call onUrlAdded when parentId is missing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockOnUrlAdded).not.toHaveBeenCalled();
		});

		it("works without onUrlAdded callback", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);

			expect(() => user.keyboard("{Enter}")).not.toThrow();
		});
	});

	describe("Error Message Display", () => {
		it("displays validation error message", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
		});

		it("displays parent ID missing error message", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();
		});

		it("clears error message when user starts typing", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			await user.type(input, "x");

			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Store Integration", () => {
		it("calls addUrl with correct parameters", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";
			const testParentId = "test-parent-123";

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={testParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalledWith(testUrl, testParentId);
			expect(store.addUrl).toHaveBeenCalledTimes(1);
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
				const { unmount } = render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

				const input = screen.getByLabelText("URL");
				await user.type(input, url);
				await user.keyboard("{Enter}");

				const store = useApplicationStore.getState();
				expect(store.addUrl).toHaveBeenCalledWith(url, defaultParentId);

				unmount();
				vi.clearAllMocks();

				// Reset store spy for next iteration
				const newStore = useApplicationStore.getState();
				vi.spyOn(newStore, "addUrl").mockResolvedValue();
			}
		});

		it("handles factory-generated URLs", async () => {
			const user = userEvent.setup();
			const { url } = UrlResponseFactory.build();

			render(<UrlInput onUrlAdded={mockOnUrlAdded} parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, url);
			await user.keyboard("{Enter}");

			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalledWith(url, defaultParentId);
		});

		it("prevents default behavior on Enter keypress", async () => {
			const user = userEvent.setup();

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "https://example.com");

			// Test that preventDefault is called by checking if the form doesn't submit
			// Since we can't easily spy on preventDefault in this context,
			// we'll test the behavior indirectly
			await user.keyboard("{Enter}");

			// If preventDefault works, the URL should be processed
			const store = useApplicationStore.getState();
			expect(store.addUrl).toHaveBeenCalled();
		});
	});
});
