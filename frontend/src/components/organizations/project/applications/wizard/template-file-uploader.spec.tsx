import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { TemplateFileUploader } from "./template-file-uploader";

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

describe("TemplateFileUploader", () => {
	const user = userEvent.setup();
	const mockAddFile = vi.fn();
	const mockAddPendingUpload = vi.fn();
	const mockRemovePendingUpload = vi.fn();

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
		useApplicationStore.setState({
			addFile: mockAddFile,
			addPendingUpload: mockAddPendingUpload,
			removePendingUpload: mockRemovePendingUpload,
		});
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => "test-uuid-123"),
		});
	});

	it("renders upload button correctly", () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
		expect(screen.getByTestId("upload-files-button")).toBeInTheDocument();
		expect(screen.getByText("Upload Documents")).toBeInTheDocument();
		expect(screen.getByTestId("file-input")).toBeInTheDocument();
	});

	it("accepts correct file types", () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

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
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toHaveAttribute("multiple");
	});

	it("uploads valid file successfully", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockAddFile).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "test-uuid-123",
					name: "test.pdf",
					type: "application/pdf",
				}),
				"parent-123",
			);
		});
	});

	it("uploads multiple files successfully", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const files = [
			new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
			new File(["content 2"], "doc2.docx", {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			}),
		];
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(mockAddFile).toHaveBeenCalledTimes(2);
			expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ name: "doc1.pdf" }), "parent-123");
			expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ name: "doc2.docx" }), "parent-123");
		});
	});

	it("rejects files that are too large", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const largeSize = 101 * 1024 * 1024;

		const largeFile = new File(["test"], "large.pdf", { type: "application/pdf" });
		Object.defineProperty(largeFile, "size", { value: largeSize });

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, largeFile);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("File large.pdf is too large"));
			expect(mockAddFile).not.toHaveBeenCalled();
		});
	});

	it("does not upload if parentId is missing", async () => {
		render(<TemplateFileUploader parentId={undefined} sourceType="template" />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockAddFile).not.toHaveBeenCalled();
		});
	});

	it("clears file input after selection", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect((fileInput as HTMLInputElement).value).toBe("");
		});
	});

	it("validates all files before uploading any", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const validFile = new File(["content 1"], "valid.pdf", { type: "application/pdf" });
		const largeFile = new File(["test"], "large.pdf", { type: "application/pdf" });
		Object.defineProperty(largeFile, "size", { value: 101 * 1024 * 1024 });

		const files = [validFile, largeFile];

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
			expect(mockAddFile).not.toHaveBeenCalled();
		});
	});

	it("generates unique IDs for each file", async () => {
		let callCount = 0;
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => `test-uuid-${++callCount}`),
		});

		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const files = [
			new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
			new File(["content 2"], "doc2.pdf", { type: "application/pdf" }),
		];

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, files);

		await waitFor(() => {
			expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ id: "test-uuid-1" }), "parent-123");
			expect(mockAddFile).toHaveBeenCalledWith(expect.objectContaining({ id: "test-uuid-2" }), "parent-123");
		});
	});

	it("button label acts as clickable area for file input", async () => {
		render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

		const label = screen.getByText("Upload Documents");
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("for", "file-upload-template-files");
		expect(label).toHaveClass("cursor-pointer");
	});

	describe("Pending Upload Management", () => {
		it("sends correct sourceType to pending upload actions for template sourceType", async () => {
			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({
						id: "test-uuid-123",
						name: "test.pdf",
						type: "application/pdf",
					}),
					"template",
				);
			});
		});

		it("sends correct sourceType to pending upload actions for application sourceType", async () => {
			render(<TemplateFileUploader parentId="parent-123" sourceType="application" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({
						id: "test-uuid-123",
						name: "test.pdf",
						type: "application/pdf",
					}),
					"application",
				);
			});
		});

		it("adds pending upload with FileWithId once file has ID assigned", async () => {
			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({
						id: "test-uuid-123",
						name: "test.pdf",
						type: "application/pdf",
					}),
					"template",
				);

				expect(mockAddPendingUpload).toHaveBeenCalledBefore(mockAddFile);
			});
		});

		it("removes pending upload when addFile throws an error", async () => {
			const testError = new Error("Upload failed");
			mockAddFile.mockRejectedValueOnce(testError);

			// Handle expected unhandled rejection
			const originalHandler = process.listeners("unhandledRejection");
			process.removeAllListeners("unhandledRejection");
			process.on("unhandledRejection", (reason) => {
				if (reason instanceof Error && reason.message === "Upload failed") {
					// This is the expected error, ignore it
					return;
				}
				// Re-throw any other unexpected errors
				throw reason;
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({ id: "test-uuid-123" }),
					"template",
				);
				expect(mockAddFile).toHaveBeenCalled();
				expect(mockRemovePendingUpload).toHaveBeenCalledWith("test-uuid-123", "template");
			});

			// Restore original handlers
			process.removeAllListeners("unhandledRejection");
			for (const handler of originalHandler) {
				process.on("unhandledRejection", handler);
			}
		});

		it("removes pending upload with correct sourceType when error occurs", async () => {
			const testError = new Error("Upload failed");
			mockAddFile.mockRejectedValueOnce(testError);

			// Handle expected unhandled rejection
			const originalHandler = process.listeners("unhandledRejection");
			process.removeAllListeners("unhandledRejection");
			process.on("unhandledRejection", (reason) => {
				if (reason instanceof Error && reason.message === "Upload failed") {
					// This is the expected error, ignore it
					return;
				}
				// Re-throw any other unexpected errors
				throw reason;
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="application" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockRemovePendingUpload).toHaveBeenCalledWith("test-uuid-123", "application");
			});

			// Restore original handlers
			process.removeAllListeners("unhandledRejection");
			for (const handler of originalHandler) {
				process.on("unhandledRejection", handler);
			}
		});

		it("calls pending upload methods in correct order during successful upload", async () => {
			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledBefore(mockAddFile);
				expect(mockRemovePendingUpload).not.toHaveBeenCalled();
			});
		});

		it("handles multiple files with correct pending upload management", async () => {
			let callCount = 0;
			vi.stubGlobal("crypto", {
				randomUUID: vi.fn(() => `test-uuid-${++callCount}`),
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const files = [
				new File(["content 1"], "doc1.pdf", { type: "application/pdf" }),
				new File(["content 2"], "doc2.docx", {
					type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				}),
			];
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, files);

			await waitFor(() => {
				expect(mockAddPendingUpload).toHaveBeenCalledTimes(2);
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({ id: "test-uuid-1", name: "doc1.pdf" }),
					"template",
				);
				expect(mockAddPendingUpload).toHaveBeenCalledWith(
					expect.objectContaining({ id: "test-uuid-2", name: "doc2.docx" }),
					"template",
				);
			});
		});

		it("does not add pending upload if parentId is missing", async () => {
			render(<TemplateFileUploader parentId={undefined} sourceType="template" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddPendingUpload).not.toHaveBeenCalled();
				expect(mockAddFile).not.toHaveBeenCalled();
			});
		});
	});
});
