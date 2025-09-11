import { describe, expect, it } from "vitest";
import { FILE_ICON_ALTS, FILE_ICON_PATHS, getFileExtension } from "./file-extensions";

describe("getFileExtension", () => {
	it("returns extension for files with standard extensions", () => {
		expect(getFileExtension("document.pdf")).toBe("pdf");
		expect(getFileExtension("data.csv")).toBe("csv");
		expect(getFileExtension("presentation.pptx")).toBe("pptx");
		expect(getFileExtension("readme.md")).toBe("md");
		expect(getFileExtension("readme.markdown")).toBe("markdown");
	});

	it("handles case insensitive extensions", () => {
		expect(getFileExtension("document.PDF")).toBe("pdf");
		expect(getFileExtension("Document.DOCX")).toBe("docx");
		expect(getFileExtension("FILE.TXT")).toBe("txt");
	});

	it("returns empty string for files without extension", () => {
		expect(getFileExtension("README")).toBe("");
		expect(getFileExtension("dockerfile")).toBe("");
		expect(getFileExtension("makefile")).toBe("");
	});

	it("returns empty string for files with empty extension", () => {
		expect(getFileExtension("file.")).toBe("");
		expect(getFileExtension("document.")).toBe("");
	});

	it("handles files with multiple dots correctly", () => {
		expect(getFileExtension("my.file.name.pdf")).toBe("pdf");
		expect(getFileExtension("config.test.js")).toBe("js");
		expect(getFileExtension("package-lock.json")).toBe("json");
		expect(getFileExtension("file.backup.2024.txt")).toBe("txt");
	});

	it("handles empty filename", () => {
		expect(getFileExtension("")).toBe("");
	});

	it("handles single dot filename", () => {
		expect(getFileExtension(".")).toBe("");
	});

	it("handles hidden files with extensions", () => {
		expect(getFileExtension(".gitignore")).toBe("gitignore");
		expect(getFileExtension(".env.local")).toBe("local");
		expect(getFileExtension(".eslintrc.json")).toBe("json");
	});
});

describe("FILE_ICON_PATHS", () => {
	it("contains paths for all supported file types", () => {
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
			expect(FILE_ICON_PATHS).toHaveProperty(type);
			expect(typeof FILE_ICON_PATHS[type as keyof typeof FILE_ICON_PATHS]).toBe("string");
			expect(FILE_ICON_PATHS[type as keyof typeof FILE_ICON_PATHS]).toMatch(/^\/icons\/file-.*\.svg$/);
		});
	});

	it("uses correct icon paths for specific file types", () => {
		expect(FILE_ICON_PATHS.csv).toBe("/icons/file-csv.svg");
		expect(FILE_ICON_PATHS.pdf).toBe("/icons/file-pdf.svg");
		expect(FILE_ICON_PATHS.docx).toBe("/icons/file-docx.svg");
		expect(FILE_ICON_PATHS.pptx).toBe("/icons/file-pptx.svg");
	});

	it("uses general icon for unsupported file types", () => {
		expect(FILE_ICON_PATHS.latex).toBe("/icons/file-general.svg");
		expect(FILE_ICON_PATHS.odt).toBe("/icons/file-general.svg");
		expect(FILE_ICON_PATHS.rst).toBe("/icons/file-general.svg");
		expect(FILE_ICON_PATHS.rtf).toBe("/icons/file-general.svg");
		expect(FILE_ICON_PATHS.txt).toBe("/icons/file-general.svg");
		expect(FILE_ICON_PATHS.xlsx).toBe("/icons/file-general.svg");
	});

	it("uses markdown icon for both md and markdown extensions", () => {
		expect(FILE_ICON_PATHS.md).toBe("/icons/file-markdown.svg");
		expect(FILE_ICON_PATHS.markdown).toBe("/icons/file-markdown.svg");
	});
});

describe("FILE_ICON_ALTS", () => {
	it("contains alt texts for all supported file types", () => {
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
			expect(FILE_ICON_ALTS).toHaveProperty(type);
			expect(typeof FILE_ICON_ALTS[type as keyof typeof FILE_ICON_ALTS]).toBe("string");
			expect(FILE_ICON_ALTS[type as keyof typeof FILE_ICON_ALTS]).toMatch(/^[A-Za-z]{2,10} file$/);
		});
	});

	it("uses correct alt texts for specific file types", () => {
		expect(FILE_ICON_ALTS.csv).toBe("CSV file");
		expect(FILE_ICON_ALTS.pdf).toBe("PDF file");
		expect(FILE_ICON_ALTS.docx).toBe("DOCX file");
		expect(FILE_ICON_ALTS.pptx).toBe("PPTX file");
	});

	it("uses same alt text for md and markdown extensions", () => {
		expect(FILE_ICON_ALTS.md).toBe("Markdown file");
		expect(FILE_ICON_ALTS.markdown).toBe("Markdown file");
	});

	it("has consistent format for all alt texts", () => {
		Object.values(FILE_ICON_ALTS).forEach((altText) => {
			expect(altText).toMatch(/^[A-Za-z]{2,10} file$/);
		});
	});
});
