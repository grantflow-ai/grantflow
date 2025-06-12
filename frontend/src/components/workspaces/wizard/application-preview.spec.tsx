import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApplicationPreview, FileWithId } from "./application-preview";

function createMockFile(name: string, size: number, type: string, id?: string): FileWithId {
	const file = new File(["content"], name, { type }) as FileWithId;
	Object.defineProperty(file, "size", { value: size, writable: false });
	if (id) {
		file.id = id;
	}
	return file;
}

describe("ApplicationPreview", () => {
	const mockOnFileRemove = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders application title", () => {
		render(<ApplicationPreview applicationTitle="Test Application" files={[]} urls={[]} />);

		expect(screen.getByText("Test Application")).toBeInTheDocument();
		expect(screen.getByText("Application Title")).toBeInTheDocument();
	});

	it("renders empty state for documents", () => {
		render(<ApplicationPreview applicationTitle="Test" files={[]} urls={[]} />);

		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
	});

	it("renders empty state for links", () => {
		render(<ApplicationPreview applicationTitle="Test" files={[]} urls={[]} />);

		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("renders uploaded files", () => {
		const files = [
			createMockFile("document.pdf", 1024 * 1024, "application/pdf"),
			createMockFile(
				"spreadsheet.xlsx",
				2 * 1024 * 1024,
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			),
		];

		render(<ApplicationPreview applicationTitle="Test" files={files} urls={[]} />);

		expect(screen.getByText("document.pdf")).toBeInTheDocument();
		expect(screen.getByText("spreadsheet.xlsx")).toBeInTheDocument();
	});

	it("renders file icons with correct extensions", () => {
		const files = [
			createMockFile("document.pdf", 1024 * 1024, "application/pdf"),
			createMockFile(
				"document.docx",
				1024 * 1024,
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			),
		];

		render(<ApplicationPreview applicationTitle="Test" files={files} urls={[]} />);

		const fileCollection = screen.getByTestId("file-collection");
		expect(fileCollection).toBeInTheDocument();

		const svgElements = fileCollection.querySelectorAll("svg");
		expect(svgElements).toHaveLength(2);

		svgElements.forEach((svg) => {
			expect(svg).toHaveAttribute("height", "56");
			expect(svg).toHaveAttribute("width", "48");
		});
	});

	it("renders links", () => {
		const urls = ["https://example.com", "https://another-example.com"];

		render(<ApplicationPreview applicationTitle="Test" files={[]} urls={urls} />);

		expect(screen.getByText("https://example.com")).toBeInTheDocument();
		expect(screen.getByText("https://another-example.com")).toBeInTheDocument();
	});

	it("opens context menu on right click", async () => {
		const user = userEvent.setup();
		const file = createMockFile("document.pdf", 1024 * 1024, "application/pdf", "file-id");

		render(<ApplicationPreview applicationTitle="Test" files={[file]} onFileRemove={mockOnFileRemove} urls={[]} />);

		const fileCard = screen.getByText("document.pdf").closest("div.group");
		await user.pointer({ keys: "[MouseRight]", target: fileCard! });

		await waitFor(() => {
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});
	});

	it("opens file in new tab when Open is clicked", async () => {
		const user = userEvent.setup();
		const file = createMockFile("document.pdf", 1024 * 1024, "application/pdf");
		const mockOpen = vi.fn();
		const mockCreateObjectURL = vi.fn().mockReturnValue("blob:url");
		const mockRevokeObjectURL = vi.fn();

		globalThis.window.open = mockOpen;
		globalThis.URL.createObjectURL = mockCreateObjectURL;
		globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

		render(<ApplicationPreview applicationTitle="Test" files={[file]} urls={[]} />);

		const fileCard = screen.getByText("document.pdf").closest("div.group");
		await user.pointer({ keys: "[MouseRight]", target: fileCard! });

		const openButton = await screen.findByText("Open");
		await user.click(openButton);

		expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
		expect(mockOpen).toHaveBeenCalledWith("blob:url", "_blank");

		await waitFor(
			() => {
				expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url");
			},
			{ timeout: 1500 },
		);
	});

	it("disables Open for unsupported file types", async () => {
		const user = userEvent.setup();
		const file = createMockFile(
			"document.docx",
			1024 * 1024,
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);

		render(<ApplicationPreview applicationTitle="Test" files={[file]} urls={[]} />);

		const fileCard = screen.getByText("document.docx").closest("div.group");
		await user.pointer({ keys: "[MouseRight]", target: fileCard! });

		const openButton = await screen.findByText("Open");
		expect(openButton.closest("div")).toHaveAttribute("aria-disabled", "true");
	});

	it("calls onFileRemove when Remove is clicked", async () => {
		const user = userEvent.setup();
		const file = createMockFile("document.pdf", 1024 * 1024, "application/pdf", "file-id");

		render(<ApplicationPreview applicationTitle="Test" files={[file]} onFileRemove={mockOnFileRemove} urls={[]} />);

		const fileCard = screen.getByText("document.pdf").closest("div.group");
		await user.pointer({ keys: "[MouseRight]", target: fileCard! });

		const removeButton = await screen.findByText("Remove");
		await user.click(removeButton);

		expect(mockOnFileRemove).toHaveBeenCalledWith(file);
	});

	it("disables Remove when no onFileRemove handler", async () => {
		const user = userEvent.setup();
		const file = createMockFile("document.pdf", 1024 * 1024, "application/pdf");

		render(<ApplicationPreview applicationTitle="Test" files={[file]} urls={[]} />);

		const fileCard = screen.getByText("document.pdf").closest("div.group");
		await user.pointer({ keys: "[MouseRight]", target: fileCard! });

		const removeButton = await screen.findByText("Remove");
		expect(removeButton.closest("div")).toHaveAttribute("aria-disabled", "true");
	});

	it("renders multiple files in grid layout", () => {
		const files = [
			createMockFile("file1.pdf", 1024 * 1024, "application/pdf"),
			createMockFile("file2.pdf", 1024 * 1024, "application/pdf"),
			createMockFile("file3.pdf", 1024 * 1024, "application/pdf"),
			createMockFile("file4.pdf", 1024 * 1024, "application/pdf"),
		];

		const { container } = render(<ApplicationPreview applicationTitle="Test" files={files} urls={[]} />);

		const grid = container.querySelector(".flex.gap-3");
		expect(grid).toBeInTheDocument();
		expect(grid?.children).toHaveLength(4);
	});
});
