import { FileWithIdFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FileWithId } from "@/types/files";
import { PendingFilePreviewCard } from "./pending-file-preview-card";

describe("PendingFilePreviewCard", () => {
	describe("Component Structure", () => {
		it("renders with correct test ids", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-icon")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-name")).toBeInTheDocument();
		});
	});

	describe("File Name Display", () => {
		it("displays the file name in text content", () => {
			const file = FileWithIdFactory.build({ name: "test-document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveTextContent("test-document.pdf");
		});

		it("shows file name in title attribute", () => {
			const file = FileWithIdFactory.build({ name: "very-long-filename-that-might-be-truncated.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveAttribute("title", "very-long-filename-that-might-be-truncated.pdf");
		});

		it("has proper truncation classes for long filenames", () => {
			const file = FileWithIdFactory.build({ name: "very-long-filename.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveClass("truncate");
			expect(fileNameElement).toHaveClass("w-full");
			expect(fileNameElement).toHaveClass("max-w-full");
		});

		it("has proper styling for pending state", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveClass("opacity-70");
			expect(fileNameElement).toHaveClass("text-app-gray-700");
			expect(fileNameElement).toHaveClass("text-[10px]");
			expect(fileNameElement).toHaveClass("leading-3");
		});
	});

	describe("Container Title Attribute", () => {
		it("shows uploading message in container title", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveAttribute("title", "Uploading document.pdf...");
		});

		it("shows correct uploading message for different file names", () => {
			const file = FileWithIdFactory.build({ name: "presentation.pptx" });
			render(<PendingFilePreviewCard file={file} />);

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveAttribute("title", "Uploading presentation.pptx...");
		});
	});

	describe("File Icon Display", () => {
		it("displays PDF icon for .pdf files", () => {
			const file = FileWithIdFactory.build({ name: "report.pdf" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-pdf.svg");
			expect(img).toHaveAttribute("alt", "PDF file");
		});

		it("displays DOCX icon for .docx files", () => {
			const file = FileWithIdFactory.build({ name: "document.docx" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-docx.svg");
			expect(img).toHaveAttribute("alt", "DOCX file");
		});

		it("displays CSV icon for .csv files", () => {
			const file = FileWithIdFactory.build({ name: "data.csv" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-csv.svg");
			expect(img).toHaveAttribute("alt", "CSV file");
		});

		it("displays Markdown icon for .md files", () => {
			const file = FileWithIdFactory.build({ name: "readme.md" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-markdown.svg");
			expect(img).toHaveAttribute("alt", "Markdown file");
		});

		it("displays PPTX icon for .pptx files", () => {
			const file = FileWithIdFactory.build({ name: "presentation.pptx" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-pptx.svg");
			expect(img).toHaveAttribute("alt", "PPTX file");
		});

		it("handles case insensitive extensions", () => {
			const file = FileWithIdFactory.build({ name: "document.PDF" });
			const { container } = render(<PendingFilePreviewCard file={file} />);

			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/icons/file-pdf.svg");
			expect(img).toHaveAttribute("alt", "PDF file");
		});

		it("handles files without extensions gracefully", () => {
			const file = FileWithIdFactory.build({ name: "README" });
			render(<PendingFilePreviewCard file={file} />);

			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-icon")).toBeInTheDocument();
		});

		it("handles files with unknown extensions", () => {
			const file = FileWithIdFactory.build({ name: "data.xyz" });
			render(<PendingFilePreviewCard file={file} />);

			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-icon")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles files with multiple dots in filename", () => {
			const file = FileWithIdFactory.build({ name: "my.file.name.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveTextContent("my.file.name.pdf");

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveAttribute("title", "Uploading my.file.name.pdf...");
		});

		it("handles empty filename gracefully", () => {
			const file = FileWithIdFactory.build({ name: "" });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveTextContent("");
			expect(fileNameElement).toHaveAttribute("title", "");

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveAttribute("title", "Uploading ...");
		});

		it("handles very long filenames", () => {
			const longFilename = `${"a".repeat(100)}.pdf`;
			const file = FileWithIdFactory.build({ name: longFilename });
			render(<PendingFilePreviewCard file={file} />);

			const fileNameElement = screen.getByTestId("pending-file-name");
			expect(fileNameElement).toHaveTextContent(longFilename);
			expect(fileNameElement).toHaveClass("truncate");

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveAttribute("title", `Uploading ${longFilename}...`);
		});

		it("handles files with FileWithId interface correctly", () => {
			const fileContent = new ArrayBuffer(1024);
			const file = new File([fileContent], "test.pdf", { type: "application/pdf" }) as FileWithId;
			file.id = "test-file-id";

			render(<PendingFilePreviewCard file={file} />);

			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-name")).toHaveTextContent("test.pdf");
		});
	});

	describe("Animation and Visual State", () => {
		it("has animate-pulse class on main container", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveClass("animate-pulse");
		});

		it("has animate-pulse class on icon container", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const iconContainer = screen.getByTestId("pending-file-icon");
			expect(iconContainer).toHaveClass("animate-pulse");
		});

		it("has proper dimensions and layout classes", () => {
			const file = FileWithIdFactory.build({ name: "document.pdf" });
			render(<PendingFilePreviewCard file={file} />);

			const container = screen.getByTestId("pending-file-preview-card");
			expect(container).toHaveClass("w-14");
			expect(container).toHaveClass("flex-col");
			expect(container).toHaveClass("items-center");
			expect(container).toHaveClass("justify-center");
		});
	});
});
