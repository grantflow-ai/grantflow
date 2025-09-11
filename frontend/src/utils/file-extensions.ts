export function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? (parts.at(-1)?.toLowerCase() ?? "") : "";
}

export const FILE_ICON_PATHS = {
	csv: "/icons/file-csv.svg",
	doc: "/icons/file-doc.svg",
	docx: "/icons/file-docx.svg",
	latex: "/icons/file-general.svg",
	markdown: "/icons/file-markdown.svg",
	md: "/icons/file-markdown.svg",
	odt: "/icons/file-general.svg",
	pdf: "/icons/file-pdf.svg",
	ppt: "/icons/file-ppt.svg",
	pptx: "/icons/file-pptx.svg",
	rst: "/icons/file-general.svg",
	rtf: "/icons/file-general.svg",
	txt: "/icons/file-general.svg",
	xlsx: "/icons/file-general.svg",
} as const;

export const FILE_ICON_ALTS = {
	csv: "CSV file",
	doc: "DOC file",
	docx: "DOCX file",
	latex: "LaTeX file",
	markdown: "Markdown file",
	md: "Markdown file",
	odt: "ODT file",
	pdf: "PDF file",
	ppt: "PPT file",
	pptx: "PPTX file",
	rst: "RST file",
	rtf: "RTF file",
	txt: "TXT file",
	xlsx: "XLSX file",
} as const;
