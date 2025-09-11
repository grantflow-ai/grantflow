import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FILE_ICON_MAP } from "./file-icon-map";

describe("FILE_ICON_MAP", () => {
	it("contains CSV icon", () => {
		const { container } = render(FILE_ICON_MAP.csv);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-csv.svg");
		expect(img).toHaveAttribute("alt", "CSV file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains DOC icon", () => {
		const { container } = render(FILE_ICON_MAP.doc);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-doc.svg");
		expect(img).toHaveAttribute("alt", "DOC file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains DOCX icon", () => {
		const { container } = render(FILE_ICON_MAP.docx);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-docx.svg");
		expect(img).toHaveAttribute("alt", "DOCX file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains PDF icon", () => {
		const { container } = render(FILE_ICON_MAP.pdf);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-pdf.svg");
		expect(img).toHaveAttribute("alt", "PDF file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains Markdown icon", () => {
		const { container } = render(FILE_ICON_MAP.markdown);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-markdown.svg");
		expect(img).toHaveAttribute("alt", "Markdown file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains MD icon", () => {
		const { container } = render(FILE_ICON_MAP.md);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-markdown.svg");
		expect(img).toHaveAttribute("alt", "Markdown file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains PPT icon", () => {
		const { container } = render(FILE_ICON_MAP.ppt);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-ppt.svg");
		expect(img).toHaveAttribute("alt", "PPT file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains PPTX icon", () => {
		const { container } = render(FILE_ICON_MAP.pptx);
		const img = container.querySelector("img");

		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icons/file-pptx.svg");
		expect(img).toHaveAttribute("alt", "PPTX file");
		expect(img).toHaveAttribute("width", "48");
		expect(img).toHaveAttribute("height", "56");
	});

	it("contains all expected file type icons", () => {
		const expectedTypes = [
			"csv",
			"doc",
			"docx",
			"latex",
			"markdown",
			"md",
			"odt",
			"pdf",
			"ppt",
			"pptx",
			"rst",
			"rtf",
			"txt",
			"xlsx",
		];

		expectedTypes.forEach((type) => {
			expect(FILE_ICON_MAP).toHaveProperty(type);
		});
	});

	it("has consistent image dimensions across all icons", () => {
		Object.values(FILE_ICON_MAP).forEach((iconElement) => {
			const { container } = render(iconElement);
			const img = container.querySelector("img");

			expect(img).toHaveAttribute("width", "48");
			expect(img).toHaveAttribute("height", "56");
			expect(img).toHaveClass("block");
		});
	});
});
