import { mockToast } from "::testing/global-mocks";
import { generateUploadUrls } from "@/actions/file";
import { faker } from "@faker-js/faker";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { FileUploader } from "./file-uploader";

vi.mock("axios");
vi.mock("@/actions/file", () => ({
	generateUploadUrls: vi.fn(),
}));

const createFile = (name: string, size: number, type: string): File => {
	const file = new File(["file"], name, { type });
	Object.defineProperty(file, "size", { value: size });
	return file;
};

const mockCreateObjectURL = vi.fn().mockImplementation(() => faker.image.url());
const mockRevokeObjectURL = vi.fn();

describe("FileUploader", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		window.URL.createObjectURL = mockCreateObjectURL;
		window.URL.revokeObjectURL = mockRevokeObjectURL;
	});

	it("renders the component correctly", async () => {
		render(<FileUploader />);

		expect(screen.getByTestId("file-uploader")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});
		expect(screen.getByText(/Drag 'n' drop files here/)).toBeInTheDocument();
	});

	it("handles file drop correctly", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const file = createFile("test.jpg", 1024, "image/jpeg");

		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});

		const input = screen.getByTestId("file-input");

		Object.defineProperty(input, "files", {
			value: [file],
		});

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByText("test.jpg")).toBeInTheDocument();
		});

		expect(onValueChange).toHaveBeenCalledWith([expect.any(File)]);
	});

	it("displays toast notification on file rejection", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const invalidFile = createFile("test.exe", 1024, "application/x-msdownload");

		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});

		const input = screen.getByTestId("file-input");

		Object.defineProperty(input, "files", {
			value: [invalidFile],
		});

		fireEvent.drop(input);

		await waitFor(() => {
			expect((mockToast as any).error).toHaveBeenCalledWith("File test.exe was rejected");
		});
	});

	it("handles multiple file uploads", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const file1 = createFile("file1.jpg", 1024, "image/jpeg");
		const file2 = createFile("file2.png", 2048, "image/png");

		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});

		const input = screen.getByTestId("file-input");

		Object.defineProperty(input, "files", {
			value: [file1, file2],
		});

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByTestId("file-card-file1.jpg")).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByTestId("file-card-file2.png")).toBeInTheDocument();
		});

		expect(onValueChange).toHaveBeenCalledWith([expect.any(File), expect.any(File)]);
	});

	it("removes file correctly", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const file = createFile("test.jpg", 1024, "image/jpeg");

		const input = screen.getByTestId("file-input");
		Object.defineProperty(input, "files", { value: [file] });

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByText("test.jpg")).toBeInTheDocument();
		});

		const removeButton = screen.getByTestId("remove-file-button");
		fireEvent.click(removeButton);

		await waitFor(() => {
			expect(screen.queryByText("test.jpg")).not.toBeInTheDocument();
		});

		expect(onValueChange).toHaveBeenCalledWith([]);
	});

	it("shows progress during file upload", async () => {
		const onValueChange = vi.fn();
		render(
			<FileUploader
				onValueChange={onValueChange}
				progresses={{
					"test.jpg": 50,
				}}
			/>,
		);

		const file = createFile("test.jpg", 1024, "image/jpeg");

		const input = screen.getByTestId("file-input");
		Object.defineProperty(input, "files", { value: [file] });

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByText("test.jpg")).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByTestId("file-progress")).toBeInTheDocument();
		});
	});

	it("displays correct file preview for images", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const imageFile = createFile("image.jpg", 1024, "image/jpeg");
		Reflect.set(imageFile, "previewUrl", faker.image.url());

		const input = screen.getByTestId("file-input");
		Object.defineProperty(input, "files", { value: [imageFile] });

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByTestId("file-preview-image")).toBeInTheDocument();
		});
	});

	it("displays default preview for non-image files", async () => {
		const onValueChange = vi.fn();
		render(<FileUploader onValueChange={onValueChange} />);

		const textFile = createFile("document.txt", 512, "text/plain");

		const input = screen.getByTestId("file-input");
		Object.defineProperty(input, "files", { value: [textFile] });

		fireEvent.drop(input);

		await waitFor(() => {
			expect(screen.getByTestId("file-preview-icon")).toBeInTheDocument();
		});
	});

	describe("handleFileUpload", () => {
		it("handles file upload correctly with mock generateUploadUrls and axios", async () => {
			const file = createFile("test.jpg", 1024, "image/jpeg");

			vi.mocked(generateUploadUrls).mockImplementation((identifiers: [string, string][]) =>
				Promise.resolve(new Map([[identifiers[0][1], "https://fake-upload-url.com"]])),
			);

			const mockOnValueChange = vi.fn();
			vi.mocked(axios.put).mockResolvedValue({ status: 200 });

			render(<FileUploader onValueChange={mockOnValueChange} />);

			await waitFor(() => {
				expect(screen.getByTestId("dropzone")).toBeInTheDocument();
			});

			const input = screen.getByTestId("file-input");

			Object.defineProperty(input, "files", { value: [file] });

			fireEvent.drop(input);

			await waitFor(() => {
				expect(screen.getByText("test.jpg")).toBeInTheDocument();
			});

			expect(generateUploadUrls).toHaveBeenCalled();
			await waitFor(() => {
				expect(axios.put).toHaveBeenCalledWith("https://fake-upload-url.com", file, expect.any(Object));
			});
		});
	});
});
