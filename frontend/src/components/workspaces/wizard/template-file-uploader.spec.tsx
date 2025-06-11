import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { mockFetch } from "::testing/global-mocks";
import { createTemplateSourceUploadUrl } from "@/actions/sources";

import { TemplateFileUploader } from "./template-file-uploader";

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
		render(<TemplateFileUploader {...DEFAULT_PROPS} />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
		expect(screen.getByText("Upload Documents")).toBeInTheDocument();
	});

	it("uploads file successfully", async () => {
		const mockUploadUrl = "https://storage.example.com/upload";

		vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
			url: mockUploadUrl,
		});

		mockFetch.mockResolvedValue({
			ok: true,
		});

		render(<TemplateFileUploader {...DEFAULT_PROPS} />);

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

		render(<TemplateFileUploader {...DEFAULT_PROPS} />);

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

		render(<TemplateFileUploader {...DEFAULT_PROPS} />);

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
});
