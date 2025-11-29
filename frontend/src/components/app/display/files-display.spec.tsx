import { FileWithIdFactory } from "::testing/factories";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe } from "vitest";

import { formatBytes } from "@/utils/format";

import { FileCard, FilesDisplay } from "./files-display";

vi.mock("@/utils/format", () => ({
	formatBytes: vi.fn().mockReturnValue("10 KB"),
}));

describe.sequential("FileCard", () => {
	afterEach(() => {
		cleanup();
	});
	const mockFile = FileWithIdFactory.build({ name: "test-document.pdf", type: "application/pdf" });
	const mockHandleRemoveFile = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders file information correctly", () => {
		render(<FileCard file={mockFile} handleRemoveFile={mockHandleRemoveFile} />);

		expect(screen.getByTestId(`file-card-${mockFile.name}`)).toBeInTheDocument();
		expect(screen.getByTestId(`file-name-display-${mockFile.name}`)).toHaveTextContent("test-document.pdf");
		expect(screen.getByTestId("file-size")).toHaveTextContent("10 KB");
		expect(screen.getByTestId("file-preview-icon")).toBeInTheDocument();
		expect(formatBytes).toHaveBeenCalledWith(mockFile.size);
	});

	it("calls handleRemoveFile when remove button is clicked", () => {
		render(<FileCard file={mockFile} handleRemoveFile={mockHandleRemoveFile} />);

		const removeButton = screen.getByTestId("remove-file-button");
		fireEvent.click(removeButton);

		expect(mockHandleRemoveFile).toHaveBeenCalledTimes(1);
	});
});

describe.sequential("FilesDisplay", () => {
	afterEach(() => {
		cleanup();
	});
	const mockFiles = [
		FileWithIdFactory.build({ name: "document1.pdf", type: "application/pdf" }),
		FileWithIdFactory.build({
			name: "document2.docx",
			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		}),
	];
	const mockOnFileRemoved = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders multiple file cards correctly", () => {
		render(<FilesDisplay files={mockFiles} onFileRemoved={mockOnFileRemoved} />);

		expect(screen.getByTestId("files-display")).toBeInTheDocument();
		expect(screen.getByTestId("files-scroll-area")).toBeInTheDocument();
		expect(screen.getByTestId(`file-card-${mockFiles[0]?.name}`)).toBeInTheDocument();
		expect(screen.getByTestId(`file-card-${mockFiles[1]?.name}`)).toBeInTheDocument();
	});

	it("calls onFileRemoved with the correct file when remove button is clicked", () => {
		render(<FilesDisplay files={mockFiles} onFileRemoved={mockOnFileRemoved} />);

		const removeButtons = screen.getAllByTestId("remove-file-button");
		const [firstButton] = removeButtons;
		if (firstButton) {
			fireEvent.click(firstButton);
		}

		expect(mockOnFileRemoved).toHaveBeenCalledTimes(1);
		expect(mockOnFileRemoved).toHaveBeenCalledWith(mockFiles[0]);
	});

	it("renders nothing when files array is empty", () => {
		render(<FilesDisplay files={[]} onFileRemoved={mockOnFileRemoved} />);

		expect(screen.queryByTestId("files-display")).not.toBeInTheDocument();
	});
});
