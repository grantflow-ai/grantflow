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

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
		useApplicationStore.setState({ addFile: mockAddFile });
		vi.stubGlobal("crypto", {
			randomUUID: vi.fn(() => "test-uuid-123"),
		});
	});

	it("renders upload button correctly", () => {
		render(<TemplateFileUploader parentId="parent-123" />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
		expect(screen.getByTestId("upload-files-button")).toBeInTheDocument();
		expect(screen.getByText("Upload Documents")).toBeInTheDocument();
		expect(screen.getByTestId("file-input")).toBeInTheDocument();
	});

	it("accepts correct file types", () => {
		render(<TemplateFileUploader parentId="parent-123" />);

		const fileInput = screen.getByTestId("file-input");
		const acceptAttribute = fileInput.getAttribute("accept");

		expect(acceptAttribute).toContain("application/pdf");
		expect(acceptAttribute).toContain("application/msword");
		expect(acceptAttribute).toContain(".docx");
		expect(acceptAttribute).toContain("text/plain");
		expect(acceptAttribute).toContain(".xlsx");
		expect(acceptAttribute).toContain(".pptx");
	});

	it("allows multiple file selection", () => {
		render(<TemplateFileUploader parentId="parent-123" />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toHaveAttribute("multiple");
	});

	it("uploads valid file successfully", async () => {
		render(<TemplateFileUploader parentId="parent-123" />);

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
		render(<TemplateFileUploader parentId="parent-123" />);

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
		render(<TemplateFileUploader parentId="parent-123" />);

		const largeSize = 101 * 1024 * 1024; // 101 MB
		const largeFile = new File(["x".repeat(largeSize)], "large.pdf", { type: "application/pdf" });
		Object.defineProperty(largeFile, "size", { value: largeSize });

		const fileInput = screen.getByTestId("file-input");
		await user.upload(fileInput, largeFile);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("File large.pdf is too large"));
			expect(mockAddFile).not.toHaveBeenCalled();
		});
	});

	it("does not upload if parentId is missing", async () => {
		render(<TemplateFileUploader parentId={undefined} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockAddFile).not.toHaveBeenCalled();
		});
	});

	it("clears file input after selection", async () => {
		render(<TemplateFileUploader parentId="parent-123" />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect((fileInput as HTMLInputElement).value).toBe("");
		});
	});

	it("handles file upload errors gracefully", async () => {
		mockAddFile.mockRejectedValueOnce(new Error("Upload failed"));

		render(<TemplateFileUploader parentId="parent-123" />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getByTestId("file-input");

		await user.upload(fileInput, file);

		await waitFor(() => {
			expect(mockAddFile).toHaveBeenCalled();
		});
	});

	it("validates all files before uploading any", async () => {
		render(<TemplateFileUploader parentId="parent-123" />);

		const files = [
			new File(["content 1"], "valid.pdf", { type: "application/pdf" }),
			new File(["x".repeat(101 * 1024 * 1024)], "large.pdf", { type: "application/pdf" }),
		];

		Object.defineProperty(files[1], "size", { value: 101 * 1024 * 1024 });

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

		render(<TemplateFileUploader parentId="parent-123" />);

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
		render(<TemplateFileUploader parentId="parent-123" />);

		const label = screen.getByText("Upload Documents");
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("for", "file-upload-template-files");
		expect(label).toHaveClass("cursor-pointer");
	});
});
