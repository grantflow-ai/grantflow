import { ApplicationFactory, FileWithIdFactory } from "::testing/factories";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import FilePreviewCard from "./file-preview-card";

describe("FilePreviewCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("File Icon Display", () => {
		it("displays CSV icon for .csv files", () => {
			const file = FileWithIdFactory.build({ name: "data.csv" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File data\.csv - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays DOC icon for .doc files", () => {
			const file = FileWithIdFactory.build({ name: "document.doc" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File document\.doc - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays DOCX icon for .docx files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays PDF icon for .pdf files", () => {
			const file = FileWithIdFactory.build({ name: "report.pdf" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open report.pdf" });
			expect(button).toBeInTheDocument();
			expect(screen.getByText("report.pdf")).toBeInTheDocument();
		});

		it("displays Markdown icon for .md files", () => {
			const file = FileWithIdFactory.build({ name: "readme.md" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File readme\.md - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays Markdown icon for .markdown files", () => {
			const file = FileWithIdFactory.build({ name: "readme.markdown" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File readme\.markdown - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays PPT icon for .ppt files", () => {
			const file = FileWithIdFactory.build({ name: "presentation.ppt" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", {
				name: /File presentation\.ppt - right click for options/i,
			});
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays PPTX icon for .pptx files", () => {
			const file = FileWithIdFactory.build({ name: "presentation.pptx" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", {
				name: /File presentation\.pptx - right click for options/i,
			});
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays general icon for files without extension", () => {
			const file = FileWithIdFactory.build({ name: "README" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File README - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays general icon for files with empty extension", () => {
			const file = FileWithIdFactory.build({ name: "file." });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File file\. - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("displays general icon for files with unknown extension", () => {
			const file = FileWithIdFactory.build({ name: "data.xyz" });
			render(<FilePreviewCard file={file} />);

			const iconContainer = screen.getByRole("img", { name: /File data\.xyz - right click for options/i });
			expect(iconContainer).toBeInTheDocument();
		});

		it("handles case insensitive extensions", () => {
			const file = FileWithIdFactory.build({ name: "document.PDF" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open document.PDF" });
			expect(button).toBeInTheDocument();
		});
	});

	describe("File Name Display", () => {
		it("displays the file name", () => {
			const file = FileWithIdFactory.build({ name: "test-document.pdf" });
			render(<FilePreviewCard file={file} />);

			expect(screen.getByTestId("file-name")).toHaveTextContent("test-document.pdf");
		});

		it("shows file name in title attribute for accessibility", () => {
			const file = FileWithIdFactory.build({ name: "very-long-filename-that-might-be-truncated.pdf" });
			render(<FilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("file-name");
			expect(fileNameElement).toHaveAttribute("title", "very-long-filename-that-might-be-truncated.pdf");
		});
	});

	describe("Context Menu", () => {
		it("opens dropdown menu on right click", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			expect(screen.getByTestId("file-menu-open")).toBeInTheDocument();
			expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
		});

		it("opens dropdown menu on right click for non-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			fireEvent.contextMenu(container);

			expect(screen.getByTestId("file-menu-open")).toBeInTheDocument();
			expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
		});

		it("disables Open option for non-browser-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			fireEvent.contextMenu(container);

			const openMenuItem = screen.getByTestId("file-menu-open");
			expect(openMenuItem).toHaveAttribute("aria-disabled", "true");
		});

		it("enables Open option for browser-openable files", () => {
			const file = FileWithIdFactory.build({ name: "image.png", type: "image/png" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open image.png" });
			fireEvent.contextMenu(button);

			const openMenuItem = screen.getByTestId("file-menu-open");
			expect(openMenuItem).not.toHaveAttribute("aria-disabled", "true");
		});
	});

	describe("Remove Functionality", () => {
		it("disables Remove option when onRemove is not provided", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).toHaveAttribute("aria-disabled", "true");
		});

		it("enables Remove option when parentId is provided", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			const removeMenuItem = screen.getByTestId("file-menu-remove");
			expect(removeMenuItem).not.toHaveAttribute("aria-disabled", "true");
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

			render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

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

	describe("Accessibility", () => {
		it("has proper aria-label for clickable files", () => {
			const file = FileWithIdFactory.build({ name: "image.png", type: "image/png" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open image.png" });
			expect(button).toHaveAttribute("aria-label", "Open image.png");
		});

		it("has proper aria-label for non-clickable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			expect(container).toHaveAttribute("aria-label", "File document.docx - right click for options");
		});

		it("has hidden dropdown trigger for screen readers", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const trigger = screen.getByText("File options");
			expect(trigger.closest("button")).toBeDisabled();
		});
	});

	describe("Edge Cases", () => {
		it("handles files with multiple dots in filename", () => {
			const file = FileWithIdFactory.build({ name: "my.file.name.pdf" });
			render(<FilePreviewCard file={file} />);

			expect(screen.getByTestId("file-name")).toHaveTextContent("my.file.name.pdf");
		});

		it("handles files with no filename", () => {
			const file = FileWithIdFactory.build({ name: "" });
			render(<FilePreviewCard file={file} />);

			const filenameSpan = screen.getByRole("img").querySelector("span[title='']");
			expect(filenameSpan).toBeInTheDocument();
			expect(filenameSpan).toHaveTextContent("");
		});

		it("handles very long filenames", () => {
			const longFilename = `${"a".repeat(100)}.pdf`;
			const file = FileWithIdFactory.build({ name: longFilename });
			render(<FilePreviewCard file={file} />);

			expect(screen.getByTestId("file-name")).toHaveTextContent(longFilename);
			expect(screen.getByTestId("file-name")).toHaveClass("truncate");
		});
	});
});
