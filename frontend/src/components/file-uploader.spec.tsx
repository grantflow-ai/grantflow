import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { mockToast } from "::testing/global-mocks";

import { FileUploader } from "./file-uploader";

vi.mock("react-dropzone", () => ({
	useDropzone: vi.fn().mockImplementation(({ onDrop }) => ({
		getInputProps: () => ({}),
		getRootProps: () => ({
			onClick: () => {},
		}),
		isDragActive: false,
		onDrop,
	})),
}));

describe("FileUploader", () => {
	const mockOnFilesAdded = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Button mode", () => {
		it("renders the upload button correctly", () => {
			render(<FileUploader fieldName="test-field" onFilesAdded={mockOnFilesAdded} />);

			const uploadButton = screen.getByTestId("upload-files-button");
			expect(uploadButton).toBeInTheDocument();
			expect(screen.getByText("Upload Documents")).toBeInTheDocument();
		});

		it("handles file selection", async () => {
			render(<FileUploader fieldName="test-field" onFilesAdded={mockOnFilesAdded} />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const input = screen.getByTestId("file-input");

			await userEvent.upload(input, file);

			expect(mockOnFilesAdded).toHaveBeenCalledWith([file]);
		});

		it("shows error toast when file is too large", async () => {
			render(<FileUploader fieldName="test-field" onFilesAdded={mockOnFilesAdded} />);

			const mockLargeFile = new File(["test content".repeat(1000)], "large.pdf", {
				type: "application/pdf",
			});

			Object.defineProperty(mockLargeFile, "size", {
				value: 101 * 1024 * 1024, // 101MB ~keep
				writable: false,
			});

			const input = screen.getByTestId("file-input");

			await userEvent.upload(input, mockLargeFile);

			expect(mockToast.error).toHaveBeenCalled();
			expect(mockOnFilesAdded).not.toHaveBeenCalled();
		});

		describe("DropZone mode", () => {
			it("renders the dropzone correctly", () => {
				render(<FileUploader fieldName="test-field" isDropZone={true} onFilesAdded={mockOnFilesAdded} />);

				const dropzone = screen.getByTestId("file-dropzone");
				expect(dropzone).toBeInTheDocument();
				expect(screen.getByText("Drag 'n' drop files here, or click to select files")).toBeInTheDocument();
			});
		});
	});
});
