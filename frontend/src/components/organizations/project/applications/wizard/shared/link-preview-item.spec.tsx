import { resetAllStores } from "::testing/store-reset";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import { LinkPreviewItem } from "./link-preview-item";

vi.mock("lucide-react", () => ({
	Link: vi.fn(({ className, "data-testid": testId }) => (
		<div className={className} data-testid={testId}>
			Link Icon
		</div>
	)),
}));

describe("LinkPreviewItem", () => {
	const user = userEvent.setup();
	const mockRemoveUrl = vi.fn();

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
		useApplicationStore.setState({ removeUrl: mockRemoveUrl });
	});

	it("renders link with correct URL", () => {
		const testUrl = "https://example.com/grant-info";

		render(<LinkPreviewItem url={testUrl} />);

		const link = screen.getByTestId("link-url");
		expect(link).toHaveAttribute("href", testUrl);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(link).toHaveTextContent(testUrl);
		expect(link).toHaveAttribute("title", testUrl);
	});

	it("shows remove icon on hover when not indexing", async () => {
		render(<LinkPreviewItem parentId="parent-123" url="https://example.com" />);

		const linkItem = screen.getByTestId("link-preview-item");
		const removeIcon = screen.getByTestId("link-remove-icon");

		expect(removeIcon).toHaveClass("opacity-0");

		await user.hover(linkItem);
		expect(removeIcon).toHaveClass("group-hover:opacity-100");
	});

	it("calls removeUrl when remove icon is clicked", async () => {
		const testUrl = "https://example.com";
		const parentId = "parent-123";

		render(<LinkPreviewItem parentId={parentId} url={testUrl} />);

		const removeIcon = screen.getByTestId("link-remove-icon");
		await user.click(removeIcon);

		expect(mockRemoveUrl).toHaveBeenCalledWith(testUrl, parentId);
	});

	it("does not call removeUrl when parentId is missing", async () => {
		render(<LinkPreviewItem url="https://example.com" />);

		const removeIcon = screen.getByTestId("link-remove-icon");
		await user.click(removeIcon);

		expect(mockRemoveUrl).not.toHaveBeenCalled();
	});

	it("applies indexing styles when status is INDEXING", () => {
		render(
			<LinkPreviewItem
				parentId="parent-123"
				sourceStatus={SourceIndexingStatus.INDEXING}
				url="https://example.com"
			/>,
		);

		const linkUrl = screen.getByTestId("link-url");
		const linkIcon = screen.getByTestId("link-icon");
		const removeIcon = screen.getByTestId("link-remove-icon");

		expect(linkUrl).toHaveClass("text-orange-500");
		expect(linkIcon).toHaveClass("text-orange-500", "cursor-not-allowed");
		expect(removeIcon).toHaveClass("cursor-not-allowed");
		expect(linkUrl).toHaveAttribute("title", "https://example.com (indexing in progress)");
	});

	it("does not call removeUrl when indexing", async () => {
		render(
			<LinkPreviewItem
				parentId="parent-123"
				sourceStatus={SourceIndexingStatus.INDEXING}
				url="https://example.com"
			/>,
		);

		const removeIcon = screen.getByTestId("link-remove-icon");
		await user.click(removeIcon);

		expect(mockRemoveUrl).not.toHaveBeenCalled();
	});

	it("applies default styles when not indexing", () => {
		render(<LinkPreviewItem parentId="parent-123" url="https://example.com" />);

		const linkUrl = screen.getByTestId("link-url");
		const linkIcon = screen.getByTestId("link-icon");
		const removeIcon = screen.getByTestId("link-remove-icon");

		expect(linkUrl).toHaveClass("text-primary", "hover:text-accent");
		expect(linkIcon).toHaveClass("text-primary");
		expect(removeIcon).toHaveClass("cursor-pointer");
	});

	it("truncates long URLs visually", () => {
		const longUrl = "https://example.com/very/long/path/that/might/need/truncation/in/the/ui/display";

		render(<LinkPreviewItem url={longUrl} />);

		const linkUrl = screen.getByTestId("link-url");
		expect(linkUrl).toHaveClass("truncate", "max-w-full");
		expect(linkUrl).toHaveTextContent(longUrl);
	});

	it("applies hover transitions for icons", () => {
		render(<LinkPreviewItem url="https://example.com" />);

		const linkIcon = screen.getByTestId("link-icon");
		const removeIcon = screen.getByTestId("link-remove-icon");

		expect(linkIcon).toHaveClass("transition-opacity", "group-hover:opacity-0");
		expect(removeIcon).toHaveClass("transition-opacity", "group-hover:opacity-100");
	});

	it("handles different source statuses correctly", () => {
		const { rerender } = render(
			<LinkPreviewItem sourceStatus={SourceIndexingStatus.FINISHED} url="https://example.com" />,
		);

		let linkUrl = screen.getByTestId("link-url");
		expect(linkUrl).not.toHaveClass("text-orange-500");
		expect(linkUrl).toHaveClass("text-primary");

		rerender(<LinkPreviewItem sourceStatus={SourceIndexingStatus.INDEXING} url="https://example.com" />);

		linkUrl = screen.getByTestId("link-url");
		expect(linkUrl).toHaveClass("text-orange-500");
		expect(linkUrl).not.toHaveClass("text-primary");

		rerender(<LinkPreviewItem sourceStatus={SourceIndexingStatus.FAILED} url="https://example.com" />);

		linkUrl = screen.getByTestId("link-url");
		expect(linkUrl).not.toHaveClass("text-orange-500");
		expect(linkUrl).toHaveClass("text-primary");
	});
});
