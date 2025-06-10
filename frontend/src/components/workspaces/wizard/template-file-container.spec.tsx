import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { mockFetch } from "::testing/global-mocks";
import { createTemplateSourceUploadUrl, deleteTemplateSource } from "@/actions/sources";

import { TemplateFileContainer } from "./template-file-container";

vi.mock("@/actions/sources", () => ({
	createTemplateSourceUploadUrl: vi.fn(),
	deleteTemplateSource: vi.fn(),
}));

const DEFAULT_PROPS = {
	templateId: "test-template-id",
	workspaceId: "test-workspace-id",
};

describe("TemplateFileContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders file uploader", () => {
		render(<TemplateFileContainer {...DEFAULT_PROPS} />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
		expect(screen.getByText("Upload Documents")).toBeInTheDocument();
	});

	it("displays initial files", () => {
		const initialFiles = [
			{
				created_at: new Date().toISOString(),
				filename: "document1.pdf",
				id: "file1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1_000_000,
			},
			{
				created_at: new Date().toISOString(),
				filename: "document2.docx",
				id: "file2",
				indexing_status: "FINISHED" as const,
				mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				size: 2_000_000,
			},
		];

		render(<TemplateFileContainer {...DEFAULT_PROPS} initialFiles={initialFiles} />);

		expect(screen.getByText("document1.pdf")).toBeInTheDocument();
		expect(screen.getByText("document2.docx")).toBeInTheDocument();
	});

	it("uploads file successfully", async () => {
		const mockUploadUrl = "https://storage.example.com/upload";

		vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
			url: mockUploadUrl,
		});

		mockFetch.mockResolvedValue({
			ok: true,
		});

		render(<TemplateFileContainer {...DEFAULT_PROPS} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await userEvent.upload(input, file);

		await waitFor(() => {
			expect(createTemplateSourceUploadUrl).toHaveBeenCalledWith(
				DEFAULT_PROPS.workspaceId,
				DEFAULT_PROPS.templateId,
				"test.pdf",
			);
		});

		expect(mockFetch).toHaveBeenCalledWith(mockUploadUrl, {
			body: file,
			headers: {
				"Content-Type": "application/pdf",
			},
			method: "PUT",
		});

		expect(toast.success).toHaveBeenCalledWith("File test.pdf uploaded successfully");
	});

	it("shows error when upload fails", async () => {
		vi.mocked(createTemplateSourceUploadUrl).mockRejectedValue(new Error("Upload failed"));

		render(<TemplateFileContainer {...DEFAULT_PROPS} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await userEvent.upload(input, file);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to upload file. Please try again.");
		});
	});

	it("shows uploading state", async () => {
		const mockUploadUrl = "https://storage.example.com/upload";

		vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
			url: mockUploadUrl,
		});

		mockFetch.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ ok: true }), 100);
				}),
		);

		render(<TemplateFileContainer {...DEFAULT_PROPS} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await userEvent.upload(input, file);

		await waitFor(() => {
			expect(screen.getByText("Uploading files...")).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.queryByText("Uploading files...")).not.toBeInTheDocument();
		});
	});

	it("deletes file successfully", async () => {
		vi.mocked(deleteTemplateSource).mockResolvedValue(undefined);

		const initialFiles = [
			{
				created_at: new Date().toISOString(),
				filename: "document1.pdf",
				id: "file1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1_000_000,
			},
		];

		render(<TemplateFileContainer {...DEFAULT_PROPS} initialFiles={initialFiles} />);

		await waitFor(() => {
			expect(screen.getByText("document1.pdf")).toBeInTheDocument();
		});

		const removeButton = screen.getByLabelText("Remove document1.pdf");
		await userEvent.click(removeButton);

		await waitFor(() => {
			expect(deleteTemplateSource).toHaveBeenCalledWith(
				DEFAULT_PROPS.workspaceId,
				DEFAULT_PROPS.templateId,
				"file1",
			);
		});

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("File document1.pdf removed");
		});
	});

	it("shows error when delete fails", async () => {
		vi.mocked(deleteTemplateSource).mockRejectedValue(new Error("Delete failed"));

		const initialFiles = [
			{
				created_at: new Date().toISOString(),
				filename: "document1.pdf",
				id: "file1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1_000_000,
			},
		];

		render(<TemplateFileContainer {...DEFAULT_PROPS} initialFiles={initialFiles} />);

		await waitFor(() => {
			expect(screen.getByText("document1.pdf")).toBeInTheDocument();
		});

		const removeButton = screen.getByLabelText("Remove document1.pdf");
		await userEvent.click(removeButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to remove file. Please try again.");
		});
	});
});
