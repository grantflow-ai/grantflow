import { UrlResponseFactory } from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";

import LinkPreviewItem from "./link-preview-item";

describe("LinkPreviewItem", () => {
	beforeEach(() => {
		useApplicationStore.setState({
			application: null,
		});
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
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles HTTPS URLs", () => {
			const url = "https://secure.example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles URLs with paths", () => {
			const url = "https://example.com/path/to/resource";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles URLs with query parameters", () => {
			const url = "https://example.com/search?q=test&type=all";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles URLs with fragments", () => {
			const url = "https://example.com/page#section1";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles long URLs", () => {
			const url = `https://example.com/${"very-long-path/".repeat(10)}resource`;
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});
	});

	describe("Icon Display", () => {
		it("shows link icon by default", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const container = screen.getByTestId("link-preview-item");
			const linkIcon = container.querySelector(".text-primary");
			expect(linkIcon).toBeInTheDocument();
			expect(linkIcon).toHaveClass("opacity-100");
		});

		it("shows remove icon with proper styling", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			expect(removeIcon).toBeInTheDocument();
			expect(removeIcon).toHaveClass("cursor-pointer");
		});

		it("has proper icon transition classes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const container = screen.getByTestId("link-preview-item");

			const removeIcon = screen.getByTestId("link-remove-icon");
			expect(removeIcon).toHaveClass("transition-opacity");
			const linkIcon = container.querySelector(".text-primary");
			expect(linkIcon).toHaveClass("transition-opacity");
		});
	});

	describe("Remove Functionality", () => {
		it("calls store removeUrl when remove icon is clicked", () => {
			const url = "https://example.com";
			const parentId = "test-parent-id";

			const mockRemoveUrl = vi.fn();
			useApplicationStore.setState({ removeUrl: mockRemoveUrl });

			render(<LinkPreviewItem parentId={parentId} url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			fireEvent.click(removeIcon);

			expect(mockRemoveUrl).toHaveBeenCalledTimes(1);
			expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
		});

		it("does not call removeUrl when parentId is not provided", () => {
			const url = "https://example.com";

			const mockRemoveUrl = vi.fn();
			useApplicationStore.setState({ removeUrl: mockRemoveUrl });

			render(<LinkPreviewItem url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			fireEvent.click(removeIcon);

			expect(mockRemoveUrl).not.toHaveBeenCalled();
		});

		it("calls removeUrl with correct URL and parentId for different URLs", () => {
			const urls = [
				"https://example.com",
				"http://test.org/path",
				"https://api.service.com/v1/endpoint?param=value",
			];
			const parentId = "test-parent-id";

			const mockRemoveUrl = vi.fn();
			useApplicationStore.setState({ removeUrl: mockRemoveUrl });

			urls.forEach((url, index) => {
				const { unmount } = render(<LinkPreviewItem parentId={parentId} url={url} />);

				const removeIcon = screen.getByTestId("link-remove-icon");
				fireEvent.click(removeIcon);

				expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
				expect(mockRemoveUrl).toHaveBeenCalledTimes(index + 1);

				unmount();
			});
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
			const url = "https://external-site.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("Styling and Layout", () => {
		it("has correct container classes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const container = screen.getByTestId("link-preview-item");
			expect(container).toHaveClass("group");
		});

		it("has correct icon container styling", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const container = screen.getByTestId("link-preview-item");
			const iconContainer = container.querySelector("div:first-child");
			expect(iconContainer).toHaveClass("flex");
		});

		it("has correct link styling", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveClass("text-blue-600");
		});
	});

	describe("Hover Behavior", () => {
		it("shows remove icon on hover via CSS classes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			expect(removeIcon).toHaveClass("group-hover:opacity-100");
		});

		it("hides link icon on hover via CSS classes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const container = screen.getByTestId("link-preview-item");
			const linkIcon = container.querySelector(".text-primary");
			expect(linkIcon).toHaveClass("group-hover:opacity-0");
		});
	});

	describe("Accessibility", () => {
		it("has proper roles and attributes", () => {
			const url = "https://example.com";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveAttribute("target", "_blank");
			expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("has clickable remove icon", () => {
			const url = "https://example.com";
			const parentId = "test-parent-id";

			const mockRemoveUrl = vi.fn();
			useApplicationStore.setState({ removeUrl: mockRemoveUrl });

			render(<LinkPreviewItem parentId={parentId} url={url} />);

			const removeIcon = screen.getByTestId("link-remove-icon");
			expect(removeIcon).toHaveClass("cursor-pointer");

			fireEvent.click(removeIcon);
			expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
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
			const url = "https://example.com/path with spaces & symbols!";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("handles URLs with unicode characters", () => {
			const url = "https://例え.テスト/パス";
			render(<LinkPreviewItem url={url} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", url);
			expect(linkElement).toHaveTextContent(url);
		});

		it("renders correctly with very long URLs", () => {
			const longUrl = `https://example.com/${"a".repeat(200)}`;
			render(<LinkPreviewItem url={longUrl} />);

			const linkElement = screen.getByTestId("link-url");
			expect(linkElement).toHaveAttribute("href", longUrl);
			expect(linkElement).toHaveTextContent(longUrl);
		});
	});

	describe("Component Integration", () => {
		it("works with factory-generated URLs", () => {
			const { url } = UrlResponseFactory.build();
			const parentId = "test-parent-id";

			const mockRemoveUrl = vi.fn();
			useApplicationStore.setState({ removeUrl: mockRemoveUrl });

			render(<LinkPreviewItem parentId={parentId} url={url} />);

			expect(screen.getByTestId("link-preview-item")).toBeInTheDocument();
			expect(screen.getByTestId("link-url")).toHaveAttribute("href", url);
			expect(screen.getByTestId("link-url")).toHaveTextContent(url);

			const removeIcon = screen.getByTestId("link-remove-icon");
			fireEvent.click(removeIcon);
			expect(mockRemoveUrl).toHaveBeenCalledWith(url, parentId);
		});

		it("maintains component state across re-renders", () => {
			const initialUrl = "https://example.com";
			const parentId = "test-parent-id";
			const { rerender } = render(<LinkPreviewItem parentId={parentId} url={initialUrl} />);

			expect(screen.getByTestId("link-url")).toHaveAttribute("href", initialUrl);

			const newUrl = "https://newsite.com";
			rerender(<LinkPreviewItem parentId={parentId} url={newUrl} />);

			expect(screen.getByTestId("link-url")).toHaveAttribute("href", newUrl);
			expect(screen.getByTestId("link-url")).toHaveTextContent(newUrl);
		});
	});
});