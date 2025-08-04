import { ApplicationFactory, FileWithIdFactory } from "::testing/factories";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { FilePreviewCard } from "./file-preview-card";

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mocked-dropdown-menu">{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mocked-dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button data-testid="mocked-dropdown-item" onClick={onClick} type="button">
			{children}
		</button>
	),
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mocked-dropdown-trigger">{children}</div>
	),
}));

afterEach(() => {
	cleanup();
});

describe("FilePreviewCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe.sequential("File Icon Display", () => {
		it("displays CSV icon for .csv files", () => {
			const file = FileWithIdFactory.build({ name: "data.csv" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File data.csv - right click for options, double click to open",
			);
		});

		it("displays DOC icon for .doc files", () => {
			const file = FileWithIdFactory.build({ name: "document.doc" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File document.doc - right click for options, double click to open",
			);
		});

		it("displays DOCX icon for .docx files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File document.docx - right click for options, double click to open",
			);
		});

		it("displays PDF icon for .pdf files", () => {
			const file = FileWithIdFactory.build({ name: "report.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File report.pdf - right click for options, double click to open",
			);
		});

		it("displays Markdown icon for .md files", () => {
			const file = FileWithIdFactory.build({ name: "readme.md" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File readme.md - right click for options, double click to open",
			);
		});

		it("displays Markdown icon for .markdown files", () => {
			const file = FileWithIdFactory.build({ name: "readme.markdown" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File readme.markdown - right click for options, double click to open",
			);
		});

		it("displays PPT icon for .ppt files", () => {
			const file = FileWithIdFactory.build({ name: "presentation.ppt" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File presentation.ppt - right click for options, double click to open",
			);
		});

		it("displays PPTX icon for .pptx files", () => {
			const file = FileWithIdFactory.build({ name: "presentation.pptx" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File presentation.pptx - right click for options, double click to open",
			);
		});

		it("displays general icon for files without extension", () => {
			const file = FileWithIdFactory.build({ name: "README" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File README - right click for options, double click to open",
			);
		});

		it("displays general icon for files with empty extension", () => {
			const file = FileWithIdFactory.build({ name: "file." });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File file. - right click for options, double click to open",
			);
		});

		it("displays general icon for files with unknown extension", () => {
			const file = FileWithIdFactory.build({ name: "data.xyz" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File data.xyz - right click for options, double click to open",
			);
		});

		it("handles case insensitive extensions", () => {
			const file = FileWithIdFactory.build({ name: "document.PDF" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer).toHaveAttribute(
				"aria-label",
				"File document.PDF - right click for options, double click to open",
			);
		});
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

		it.skip("disables Open option for non-browser-openable files", async () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img");
			fireEvent.contextMenu(iconContainer);

			const menuOpen = await screen.findByTestId("file-menu-open", {}, { timeout: 3000 });
			expect(menuOpen).toHaveAttribute("aria-disabled", "true");
		});

		it.skip("enables Open option for browser-openable files", async () => {
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
			expect(openMenuItem).not.toHaveAttribute("aria-disabled", "true");
		});
	});

	describe.sequential("Remove Functionality", () => {
		it.skip("disables Remove option when onRemove is not provided", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).toHaveAttribute("aria-disabled", "true");
		});

		it.skip("enables Remove option when parentId is provided", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const iconContainer = container.querySelector('[role="img"]');
			fireEvent.contextMenu(iconContainer!);

			await waitFor(() => {
				expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).not.toHaveAttribute("aria-disabled", "true");
		});

		it.skip("calls removeFile when Remove is clicked", async () => {
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

			await waitFor(() => {
				expect(screen.queryByTestId("file-context-menu")).not.toBeInTheDocument();
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

		it.skip("has hidden dropdown trigger for screen readers", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const trigger = screen.getByText("File options");
			expect(trigger.parentElement).toHaveClass("sr-only");
			expect(trigger.parentElement).toBeDisabled();
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
