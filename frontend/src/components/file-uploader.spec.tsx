import { render, screen } from "@testing-library/react";
import { FileUploader } from "./file-uploader";
import { mockToast } from "../../testing/global-mocks";
import userEvent from "@testing-library/user-event";

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
			expect(screen.getByText("Upload Files")).toBeInTheDocument();
		});

		it("handles file selection", async () => {
			render(<FileUploader fieldName="test-field" onFilesAdded={mockOnFilesAdded} />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const input = screen.getByTestId("file-input");

			await userEvent.upload(input, file);

			expect(mockOnFilesAdded).toHaveBeenCalledWith([file]);
		});

		it("shows file count when maxFileCount is specified", () => {
			render(
				<FileUploader
					currentFileCount={2}
					fieldName="test-field"
					maxFileCount={5}
					onFilesAdded={mockOnFilesAdded}
				/>,
			);

			expect(screen.getByText("2 / 5 files uploaded")).toBeInTheDocument();
		});

		it("disables the button when max files are reached", () => {
			render(
				<FileUploader
					currentFileCount={3}
					fieldName="test-field"
					maxFileCount={3}
					onFilesAdded={mockOnFilesAdded}
				/>,
			);

			const input = screen.getByTestId("file-input");
			expect(input).toBeDisabled();
		});

		it("shows error toast when file is too large", async () => {
			render(<FileUploader fieldName="test-field" onFilesAdded={mockOnFilesAdded} />);

			const file = new File(["test content".repeat(10_000_000)], "large.pdf", { type: "application/pdf" });
			const input = screen.getByTestId("file-input");

			await userEvent.upload(input, file);

			expect(mockToast.error).toHaveBeenCalled();
			expect(mockOnFilesAdded).not.toHaveBeenCalled();
		});

		it("shows error toast when too many files are added", async () => {
			render(
				<FileUploader
					currentFileCount={1}
					fieldName="test-field"
					maxFileCount={2}
					onFilesAdded={mockOnFilesAdded}
				/>,
			);

			const files = [
				new File(["content1"], "test1.pdf", { type: "application/pdf" }),
				new File(["content2"], "test2.pdf", { type: "application/pdf" }),
			];

			const input = screen.getByTestId("file-input");
			await userEvent.upload(input, files);

			expect(mockToast.error).toHaveBeenCalled();
			expect(mockOnFilesAdded).not.toHaveBeenCalled();
		});
	});

	describe("DropZone mode", () => {
		it("renders the dropzone correctly", () => {
			render(<FileUploader fieldName="test-field" isDropZone={true} onFilesAdded={mockOnFilesAdded} />);

			const dropzone = screen.getByTestId("file-dropzone");
			expect(dropzone).toBeInTheDocument();
			expect(screen.getByText("Drag 'n' drop files here, or click to select files")).toBeInTheDocument();
		});

		it("shows file count when maxFileCount is specified in dropzone mode", () => {
			render(
				<FileUploader
					currentFileCount={2}
					fieldName="test-field"
					isDropZone={true}
					maxFileCount={5}
					onFilesAdded={mockOnFilesAdded}
				/>,
			);

			expect(screen.getByText("2 / 5 files uploaded")).toBeInTheDocument();
		});
	});
});
