import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RagSourceFileUploader } from "./rag-source-file-uploader";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@/components/app/buttons/app-button", () => ({
	AppButton: vi.fn(({ children, leftIcon, ...props }) => (
		<button {...props}>
			{leftIcon}
			{children}
		</button>
	)),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("RagSourceFileUploader", () => {
	const user = userEvent.setup();
	const mockOnFileAdd = vi.fn().mockResolvedValue(undefined);
	const mockOnFileRemove = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => "test-uuid-123"),
		});
	});

	it("renders upload button correctly", () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		expect(screen.getByTestId("rag-source-file-container")).toBeInTheDocument();
		expect(screen.getByTestId("upload-files-button")).toBeInTheDocument();
		expect(screen.getByText("Upload Documents")).toBeInTheDocument();
		expect(screen.getByTestId("file-input")).toBeInTheDocument();
	});

	it("renders with custom testId", () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} testId="custom-test" />);

		expect(screen.getByTestId("custom-test-container")).toBeInTheDocument();
		expect(screen.getByTestId("custom-test-button")).toBeInTheDocument();
		expect(screen.getByTestId("custom-test-input")).toBeInTheDocument();
	});

	it("accepts correct file types", () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const fileInput = screen.getByTestId("file-input");
		const acceptAttribute = fileInput.getAttribute("accept");

		expect(acceptAttribute).toContain("application/pdf");
		expect(acceptAttribute).toContain("application/msword");
		expect(acceptAttribute).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
		expect(acceptAttribute).toContain("text/plain");
		expect(acceptAttribute).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		expect(acceptAttribute).toContain("application/vnd.openxmlformats-officedocument.presentationml.presentation");
	});

	it("allows multiple file selection", () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toHaveAttribute("multiple");
	});

	it("uploads valid file successfully", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "test-uuid-123",
					name: "test.pdf",
					type: "application/pdf",
				}),
			);
		});
	});

	it("uploads multiple files successfully", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const files = [
			new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
			new File(["content 2"], "doc2.docx", {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			}),
		];
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalledTimes(2);
			expect(mockOnFileAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "doc1.pdf" }));
			expect(mockOnFileAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "doc2.docx" }));
		});
	});

	it("rejects files that are too large", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const largeSize = 101 * 1024 * 1024;

		const largeFile = new File(["test"], "large.pdf", { type: "application/pdf" });
		Object.defineProperty(largeFile, "size", { value: largeSize });

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, largeFile);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("File large.pdf is too large"));
			expect(mockOnFileAdd).not.toHaveBeenCalled();
		});
	});

	it("clears file input after selection", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect((fileInput as HTMLInputElement).value).toBe("");
		});
	});

	it("validates all files before uploading any", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const validFile = new File(["content 1"], "valid.pdf", { type: "application/pdf" });
		const largeFile = new File(["test"], "large.pdf", { type: "application/pdf" });
		Object.defineProperty(largeFile, "size", { value: 101 * 1024 * 1024 });

		const files = [validFile, largeFile];

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
			expect(mockOnFileAdd).not.toHaveBeenCalled();
		});
	});

	it("generates unique IDs for each file", async () => {
		let callCount = 0;
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => `test-uuid-${++callCount}`),
		});

		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const files = [
			new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
			new File(["content 2"], "doc2.pdf", { type: "application/pdf" }),
		];

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "test-uuid-1" }));
			expect(mockOnFileAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "test-uuid-2" }));
		});
	});

	it("button label acts as clickable area for file input", async () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const label = screen.getByText("Upload Documents");
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("for", "file-upload-rag-source");
		expect(label).toHaveClass("cursor-pointer");
	});

	it("calls onFileRemove when upload fails", async () => {
		const testError = new Error("Upload failed");
		mockOnFileAdd.mockRejectedValueOnce(testError);

		const originalHandler = process.listeners("unhandledRejection");
		process.removeAllListeners("unhandledRejection");
		process.on("unhandledRejection", (reason) => {
			if (reason instanceof Error && reason.message === "Upload failed") {
				return;
			}
			throw reason;
		});

		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} onFileRemove={mockOnFileRemove} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalled();
			expect(mockOnFileRemove).toHaveBeenCalledWith("test-uuid-123");
		});

		process.removeAllListeners("unhandledRejection");
		for (const handler of originalHandler) {
			process.on("unhandledRejection", handler);
		}
	});

	it("does not call onFileRemove if not provided", async () => {
		const testError = new Error("Upload failed");
		mockOnFileAdd.mockRejectedValueOnce(testError);

		const originalHandler = process.listeners("unhandledRejection");
		process.removeAllListeners("unhandledRejection");
		process.on("unhandledRejection", (reason) => {
			if (reason instanceof Error && reason.message === "Upload failed") {
				return;
			}
			throw reason;
		});

		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalled();
		});

		process.removeAllListeners("unhandledRejection");
		for (const handler of originalHandler) {
			process.on("unhandledRejection", handler);
		}
	});

	it("uses custom inputId with testId", () => {
		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} testId="custom-test" />);

		const input = screen.getByTestId("custom-test-input");
		expect(input).toHaveAttribute("id", "custom-test-file-input");
	});

	it("handles concurrent file uploads correctly", async () => {
		let callCount = 0;
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => `test-uuid-${++callCount}`),
		});

		// Make uploads take time to simulate concurrent behavior
		mockOnFileAdd.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10)));

		render(<RagSourceFileUploader onFileAdd={mockOnFileAdd} />);

		const files = [
			new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
			new File(["content 2"], "doc2.pdf", { type: "application/pdf" }),
			new File(["content 3"], "doc3.pdf", { type: "application/pdf" }),
		];

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(mockOnFileAdd).toHaveBeenCalledTimes(3);
		});
	});
});
