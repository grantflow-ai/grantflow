import type { EditorRef } from "@grantflow/editor";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorExportButton } from "./editor-export-button";

const mockConvertFile = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("@/actions/file-conversion", () => ({
	convertFile: mockConvertFile,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({ children, "data-testid": testId, onClick, ...props }: any) => (
		<button data-testid={testId ?? "dropdown-item"} onClick={onClick} type="button" {...props}>
			{children}
		</button>
	),
	DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock("sonner", () => ({
	toast: {
		error: mockToastError,
	},
}));

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

describe.sequential("EditorExportButton", () => {
	const mockEditorRef = React.createRef<EditorRef | null>();

	beforeEach(() => {
		// Setup mock editor
		mockEditorRef.current = {
			getHTML: vi.fn().mockReturnValue("<p>Test content</p>"),
		} as unknown as EditorRef;

		mockConvertFile.mockResolvedValue(new Blob(["test content"], { type: "application/pdf" }));

		mockCreateObjectURL.mockReturnValue("blob:test-url");
		mockRevokeObjectURL.mockImplementation(() => {});

		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders export button", async () => {
		render(<EditorExportButton editorRef={mockEditorRef} />);

		const exportButton = screen.getByTestId("editor-export-button");
		expect(exportButton).toBeInTheDocument();
	});

	it("shows dropdown menu items", async () => {
		const user = userEvent.setup();
		render(<EditorExportButton editorRef={mockEditorRef} />);

		const exportButton = screen.getByTestId("editor-export-button");
		await user.click(exportButton);

		await waitFor(() => {
			expect(screen.getByTestId("editor-export-list")).toBeInTheDocument();
			expect(screen.getByTestId("editor-export-pdf")).toBeInTheDocument();
			expect(screen.getByTestId("editor-export-markdown")).toBeInTheDocument();
		});
	});

	it("exports as DOCX when DOC button is clicked", async () => {
		const user = userEvent.setup();
		render(<EditorExportButton editorRef={mockEditorRef} />);

		const exportButton = screen.getByTestId("editor-export-button");
		await user.click(exportButton);

		const docxButton = screen.getByTestId("editor-export-list");
		await user.click(docxButton);

		expect(mockConvertFile).toHaveBeenCalledWith({
			filename: "grant_application.docx",
			html_content: "<p>Test content</p>",
			output_format: "docx",
		});
	});

	it("exports as PDF when PDF button is clicked", async () => {
		const user = userEvent.setup();
		render(<EditorExportButton editorRef={mockEditorRef} />);

		const exportButton = screen.getByTestId("editor-export-button");
		await user.click(exportButton);

		const pdfButton = screen.getByTestId("editor-export-pdf");
		await user.click(pdfButton);

		expect(mockConvertFile).toHaveBeenCalledWith({
			filename: "grant_application.pdf",
			html_content: "<p>Test content</p>",
			output_format: "pdf",
		});
	});

	it("exports as md when Markdown button is clicked", async () => {
		const user = userEvent.setup();
		render(<EditorExportButton editorRef={mockEditorRef} />);

		const exportButton = screen.getByTestId("editor-export-button");
		await user.click(exportButton);

		const markdownButton = screen.getByTestId("editor-export-markdown");
		await user.click(markdownButton);

		expect(mockConvertFile).toHaveBeenCalledWith({
			filename: "grant_application.md",
			html_content: "<p>Test content</p>",
			output_format: "md",
		});
	});
});
