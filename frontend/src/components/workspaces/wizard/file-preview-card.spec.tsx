import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FileWithIdFactory } from "::testing/factories";
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

			expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
		});

		it("shows file name in title attribute for accessibility", () => {
			const file = FileWithIdFactory.build({ name: "very-long-filename-that-might-be-truncated.pdf" });
			render(<FilePreviewCard file={file} />);

			const fileNameElement = screen.getByText("very-long-filename-that-might-be-truncated.pdf");
			expect(fileNameElement).toHaveAttribute("title", "very-long-filename-that-might-be-truncated.pdf");
		});
	});

	describe("Browser-Openable Files", () => {
		const browserOpenableExtensions = ["gif", "jpeg", "jpg", "pdf", "png", "svg", "webp"];

		browserOpenableExtensions.forEach((extension) => {
			it(`renders as clickable button for ${extension} files`, () => {
				const file = FileWithIdFactory.build({ name: `image.${extension}` });
				render(<FilePreviewCard file={file} />);

				const button = screen.getByRole("button", { name: `Open image.${extension}` });
				expect(button).toBeInTheDocument();
				expect(button).toHaveAttribute("title", "Click to open file");
			});
		});

		it("opens file in new tab when clicked", () => {
			const mockCreateObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test-url");
			const mockRevokeObjectURL = vi.fn();
			const mockWindowOpen = vi.fn();

			globalThis.URL.createObjectURL = mockCreateObjectURL;
			globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
			globalThis.window.open = mockWindowOpen;

			const file = new File(["test content"], "image.png", { type: "image/png" }) as any;
			file.id = "test-id";
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open image.png" });
			fireEvent.click(button);

			expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
			expect(mockWindowOpen).toHaveBeenCalledWith("blob:http://localhost/test-url", "_blank");
		});

		it("revokes object URL after opening file", () => {
			vi.useFakeTimers();
			const mockCreateObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test-url");
			const mockRevokeObjectURL = vi.fn();
			const mockWindowOpen = vi.fn();

			globalThis.URL.createObjectURL = mockCreateObjectURL;
			globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
			globalThis.window.open = mockWindowOpen;

			const file = new File(["test content"], "image.png", { type: "image/png" }) as any;
			file.id = "test-id";
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open image.png" });
			fireEvent.click(button);

			vi.advanceTimersByTime(1000);

			expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test-url");
			vi.useRealTimers();
		});
	});

	describe("Non-Browser-Openable Files", () => {
		it("renders as non-clickable div for non-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			expect(container).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /Open document\.docx/i })).not.toBeInTheDocument();
		});
	});

	describe("Context Menu", () => {
		it("opens dropdown menu on right click", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});

		it("opens dropdown menu on right click for non-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			fireEvent.contextMenu(container);

			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});

		it("disables Open option for non-browser-openable files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			render(<FilePreviewCard file={file} />);

			const container = screen.getByRole("img", { name: /File document\.docx - right click for options/i });
			fireEvent.contextMenu(container);

			const openMenuItem = screen.getByText("Open").closest("div");
			expect(openMenuItem).toHaveAttribute("aria-disabled", "true");
		});

		it("enables Open option for browser-openable files", () => {
			const file = FileWithIdFactory.build({ name: "image.png" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open image.png" });
			fireEvent.contextMenu(button);

			const openMenuItem = screen.getByText("Open").closest("div");
			expect(openMenuItem).not.toHaveAttribute("aria-disabled", "true");
		});
	});

	describe("Remove Functionality", () => {
		it("disables Remove option when onRemove is not provided", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			const removeMenuItem = screen.getByText("Remove").closest("div");
			expect(removeMenuItem).toHaveAttribute("aria-disabled", "true");
		});

		it("enables Remove option when parentId is provided", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			const removeMenuItem = screen.getByText("Remove").closest("div");
			expect(removeMenuItem).not.toHaveAttribute("aria-disabled", "true");
		});

		it("calls removeFile when Remove is clicked", async () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			
			// Mock the removeFile function to avoid async issues
			const mockRemoveFile = vi.fn().mockResolvedValue(undefined);
			
			// Set up application in store so removeFile doesn't fail
			useApplicationStore.setState({
				application: {
					id: "test-parent-id",
					title: "Test App",
					workspace_id: "test-workspace",
					grant_template: null,
					rag_sources: [],
				},
				removeFile: mockRemoveFile,
			});
			
			render(<FilePreviewCard file={file} parentId="test-parent-id" />);

			const button = screen.getByRole("button", { name: "Open document.pdf" });
			fireEvent.contextMenu(button);

			await waitFor(() => {
				expect(screen.getByText("Remove")).toBeInTheDocument();
			});

			const removeMenuItem = screen.getByText("Remove");
			fireEvent.click(removeMenuItem);

			// Wait for the removeFile function to be called
			await waitFor(() => {
				expect(mockRemoveFile).toHaveBeenCalledWith(file, "test-parent-id");
			});

			// Wait for the dropdown to close after the operation completes
			await waitFor(() => {
				expect(screen.queryByText("Remove")).not.toBeInTheDocument();
			});
		});

	});

	describe("Layout and Styling", () => {
		it("has correct CSS classes for hover and transition effects", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			const { container } = render(<FilePreviewCard file={file} />);

			const cardElement = container.firstChild as HTMLElement;
			expect(cardElement).toHaveClass(
				"hover:bg-app-gray-100",
				"group",
				"relative",
				"flex",
				"cursor-pointer",
				"flex-col",
				"items-center",
				"justify-center",
				"rounded",
				"bg-white",
				"p-2",
				"transition-all",
			);
		});

		it("renders file icon with correct dimensions", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<FilePreviewCard file={file} />);

			// PDF files render as buttons, the FileIcon component renders a div with flex classes
			const button = screen.getByRole("button", { name: "Open document.pdf" });
			const iconContainerDiv = button.querySelector("div.mb-1 div.flex");
			expect(iconContainerDiv).toHaveClass("flex", "items-center", "justify-center");
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label for clickable files", () => {
			const file = FileWithIdFactory.build({ name: "image.png" });
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
			expect(trigger.closest("button")).toHaveClass("sr-only");
			expect(trigger.closest("button")).toBeDisabled();
		});
	});

	describe("Edge Cases", () => {
		it("handles files with multiple dots in filename", () => {
			const file = FileWithIdFactory.build({ name: "my.file.name.pdf" });
			render(<FilePreviewCard file={file} />);

			expect(screen.getByText("my.file.name.pdf")).toBeInTheDocument();
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

			expect(screen.getByText(longFilename)).toBeInTheDocument();
			expect(screen.getByText(longFilename)).toHaveClass("truncate");
		});
	});
});
