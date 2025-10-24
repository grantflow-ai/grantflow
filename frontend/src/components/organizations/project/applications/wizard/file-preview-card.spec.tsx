import { ApplicationFactory, FileWithIdFactory } from "::testing/factories";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { FilePreviewCard } from "./file-preview-card";

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<"div">) => (
		<div data-testid="mocked-dropdown-menu" {...props}>
			{children}
		</div>
	),
	DropdownMenuContent: ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<"div">) => (
		<div {...props}>{children}</div>
	),
	DropdownMenuItem: ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<"button">) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
	DropdownMenuTrigger: ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<"button">) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
}));

const { mockCreateFileDownloadUrl } = vi.hoisted(() => {
	return { mockCreateFileDownloadUrl: vi.fn() };
});

vi.mock("@/actions/granting-institutions", () => ({
	createFileDownloadUrl: mockCreateFileDownloadUrl,
}));

afterEach(() => {
	cleanup();
});

describe("FilePreviewCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe.sequential("File Name Display", () => {
		it("displays the file name", () => {
			const file = FileWithIdFactory.build({ name: "test-document.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const fileNameElement = container.querySelector('[data-testid="file-name"]');
			expect(fileNameElement).toHaveTextContent("test-document.pdf");
		});

		it("shows file name in title attribute for accessibility", () => {
			const file = FileWithIdFactory.build({ name: "very-long-filename-that-might-be-truncated.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const fileNameElement = container.querySelector('[data-testid="file-name"]');
			expect(fileNameElement).toHaveAttribute("title", "very-long-filename-that-might-be-truncated.pdf");
		});
	});

	describe.sequential("Context Menu", () => {
		it("opens dropdown menu on right click", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			expect(iconContainer).toBeInTheDocument();
		});

		it("opens dropdown menu on right click for non-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			expect(iconContainer).toBeInTheDocument();
		});

		it("disables Open option for non-browser-openable files", async () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = document.querySelector('[role="img"]')!;
			fireEvent.contextMenu(iconContainer);

			const menuOpen = await screen.findByTestId("file-menu-open", {}, { timeout: 3000 });
			expect(menuOpen).toBeDisabled();
		});

		it("enables Open option for browser-openable files", async () => {
			const fileContent = new ArrayBuffer(1024);
			const file = new File([fileContent], "document.pdf", { type: "application/pdf" }) as FileWithId;
			file.id = "test-id";

			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-menu-open")).toBeInTheDocument();
			});

			const openMenuItem = screen.getByTestId("file-menu-open");
			expect(openMenuItem).not.toBeDisabled();
		});

		it("enables Open option for url files", async () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			mockCreateFileDownloadUrl.mockResolvedValueOnce({
				url: "https://upload.url/path",
			});
			render(<FilePreviewCard file={file} />);

			const iconContainer = document.querySelector('[role="img"]')!;
			fireEvent.contextMenu(iconContainer);

			const menuOpen = await screen.findByTestId("file-menu-open", {}, { timeout: 3000 });
			expect(menuOpen).toBeDisabled();
		});
	});

	describe.sequential("Remove Functionality", () => {
		it("disables Remove option when onRemove is not provided", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).toBeDisabled();
		});

		it("enables Remove option when parentId is provided", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).not.toBeDisabled();
		});

		it("calls removeFile when Remove is clicked", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });

			const mockRemoveFile = vi.fn().mockResolvedValue(undefined);

			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-parent-id",
				project_id: "test-project",
				rag_sources: [],
				title: "Test App",
			});

			useApplicationStore.setState({
				application,
				removeFile: mockRemoveFile,
			});

			const { container } = render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-context-menu")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			fireEvent.click(removeMenuItem);

			await waitFor(() => {
				expect(mockRemoveFile).toHaveBeenCalledWith(file, "test-parent-id");
			});
		});
	});

	describe.sequential("Accessibility", () => {
		it("has proper aria-label for clickable files", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf", type: "application/pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File document.pdf - right click for options, double click to open",
			);
		});

		it("has proper aria-label for non-clickable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File document.docx - right click for options, double click to open",
			);
		});

		it("has hidden dropdown trigger for screen readers", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const srLabel = screen.getByText("File options");
			const trigger = srLabel.parentElement as HTMLButtonElement;
			expect(trigger).toHaveClass("sr-only");
			expect(trigger).toBeDisabled();
		});
	});

	describe.sequential("Edge Cases", () => {
		it("handles files with multiple dots in filename", () => {
			const file = FileWithIdFactory.build({ name: "my.file.name.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const fileNameElement = container.querySelector('[data-testid="file-name"]');
			expect(fileNameElement).toHaveTextContent("my.file.name.pdf");
		});

		it("handles files with no filename", () => {
			const file = FileWithIdFactory.build({ name: "" });
			const { container } = render(<FilePreviewCard file={file} />);

			const filenameSpan = container.querySelector('[data-testid="file-name"]');
			expect(filenameSpan).toBeInTheDocument();
			expect(filenameSpan).toHaveTextContent("");
			expect(filenameSpan).toHaveAttribute("title", "");
		});

		it("handles very long filenames", () => {
			const longFilename = `${"a".repeat(100)}.pdf`;
			const file = FileWithIdFactory.build({ name: longFilename });
			const { container } = render(<FilePreviewCard file={file} />);

			const fileNameElement = container.querySelector('[data-testid="file-name"]');
			expect(fileNameElement).toHaveTextContent(longFilename);
			expect(fileNameElement).toHaveClass("truncate");
		});
	});
});
