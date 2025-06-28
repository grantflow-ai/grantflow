import { UrlResponseFactory } from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";

import { LinkPreviewItem } from "./link-preview-item";

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: vi.fn(),
}));

describe("LinkPreviewItem", () => {
	const mockRemoveUrl = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useApplicationStore).mockReturnValue(mockRemoveUrl);
	});

	describe("Basic Rendering", () => {
		it("renders the component with correct structure", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			expect(screen.getByTestId("link-preview-item")).toBeInTheDocument();
			expect(screen.getByTestId("link-url")).toBeInTheDocument();
			expect(screen.getByTestId("link-remove-icon")).toBeInTheDocument();
		});

		it("displays the provided URL", () => {
			const { url } = UrlResponseFactory.build();
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveTextContent(url);
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("renders with correct accessibility attributes", () => {
			const url = "https://example.com/test-page";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("target", "_blank");
			expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("URL Variations", () => {
		it("handles HTTP URLs", () => {
			const url = "http://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("handles HTTPS URLs", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("handles URLs with paths", () => {
			const url = "https://example.com/path/to/page";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("handles URLs with query parameters", () => {
			const url = "https://example.com?param1=value1&param2=value2";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("handles URLs with fragments", () => {
			const url = "https://example.com#section";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
		});
	});

	describe("Remove Functionality", () => {
		it("calls store removeUrl when remove icon is clicked and parentId is provided", async () => {
			const url = "https://example.com";
			const parentId = "parent-123";
			render(<LinkPreviewItem parentId={parentId} url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			fireEvent.click(removeIcon);

			expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
		});

		it("does not call removeUrl when parentId is not provided", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			fireEvent.click(removeIcon);

			expect(mockRemoveUrl).not.toHaveBeenCalled();
		});

		it("calls removeUrl with correct URL and parentId for different URLs", async () => {
			const url1 = "https://example1.com";
			const url2 = "https://example2.com";
			const parentId = "parent-456";

			const { rerender } = render(<LinkPreviewItem parentId={parentId} url={url1} />);
			fireEvent.click(screen.getByTestId("link-remove-icon"));
			expect(mockRemoveUrl).toHaveBeenCalledWith(url1, parentId);

			mockRemoveUrl.mockClear();

			rerender(<LinkPreviewItem parentId={parentId} url={url2} />);
			fireEvent.click(screen.getByTestId("link-remove-icon"));
			expect(mockRemoveUrl).toHaveBeenCalledWith(url2, parentId);
		});
	});

	describe("Link Functionality", () => {
		it("renders as a clickable link", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement.tagName).toBe("A");
			expect(linkElement).toHaveAttribute("href", url);
		});

		it("opens in new tab", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("target", "_blank");
		});

		it("has security attributes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("Accessibility", () => {
		it("has clickable remove icon", () => {
			const url = "https://example.com";
			const parentId = "parent-123";
			render(<LinkPreviewItem parentId={parentId} url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			expect(removeIcon).toBeInTheDocument();

			fireEvent.click(removeIcon);
			expect(mockRemoveUrl).toHaveBeenCalled();
		});
	});

	describe("Edge Cases", () => {
		it("handles empty URL string", () => {
			const url = "";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", "");
			expect(linkElement).toHaveTextContent("");
		});

		it("handles URLs with special characters", () => {
			const url = "https://example.com/path?query=hello%20world&special=@#$";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles URLs with unicode characters", () => {
			const url = "https://example.com/福利";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});
	});

	describe("Component Integration", () => {
		it("works with factory-generated URLs", () => {
			const { url } = UrlResponseFactory.build();
			render(<LinkPreviewItem url={url} />);

			expect(screen.getByTestId("link-url")).toHaveTextContent(url);
		});

		it("maintains component state across re-renders", () => {
			const url = "https://example.com";
			const parentId = "parent-123";

			const { rerender } = render(<LinkPreviewItem parentId={parentId} url={url} />);

			expect(screen.getByTestId("link-url")).toHaveTextContent(url);

			rerender(<LinkPreviewItem parentId={parentId} url={url} />);

			expect(screen.getByTestId("link-url")).toHaveTextContent(url);
			fireEvent.click(screen.getByTestId("link-remove-icon"));
			expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
		});
	});
});