/* eslint-disable vitest/expect-expect */
import { setupAnalyticsMocks } from "::testing/analytics-test-utils";
import { ApplicationFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import * as segment from "@/utils/segment";

import { TemplateFileUploader } from "./template-file-uploader";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@/utils/segment");

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

			const originalHandler = process.listeners("unhandledRejection");
			process.removeAllListeners("unhandledRejection");
			process.on("unhandledRejection", (reason) => {
				if (reason instanceof Error && reason.message === "Upload failed") {
					return;
				}
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

			process.removeAllListeners("unhandledRejection");
			for (const handler of originalHandler) {
				process.on("unhandledRejection", handler);
			}
		});

		it("removes pending upload with correct sourceType when error occurs", async () => {
			const testError = new Error("Upload failed");
			mockAddFile.mockRejectedValueOnce(testError);

			const originalHandler = process.listeners("unhandledRejection");
			process.removeAllListeners("unhandledRejection");
			process.on("unhandledRejection", (reason) => {
				if (reason instanceof Error && reason.message === "Upload failed") {
					return;
				}
				throw reason;
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="application" />);

			const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
			const fileInput = screen.getByTestId("file-input");

			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockRemovePendingUpload).toHaveBeenCalledWith("test-uuid-123", "application");
			});

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

	describe("Analytics tracking", () => {
		const { expectEventTracked, expectNoEventsTracked, resetAnalyticsMocks } = setupAnalyticsMocks();

		beforeEach(() => {
			resetAnalyticsMocks();
			useOrganizationStore.setState({
				selectedOrganizationId: "org-123",
			});
			const application = ApplicationFactory.build({
				id: "app-123",
				project_id: "proj-123",
				title: "Test Application",
			});
			useApplicationStore.setState({
				application,
			});
			mockAddFile.mockResolvedValue({
				filename: "test.pdf",
				sourceId: "source-123",
				status: "CREATED",
			});
		});

		it("tracks file upload for step 1 (Application Details)", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["content"], "document.pdf", { type: "application/pdf" });
			Object.defineProperty(file, "size", { value: 1_024_000 });

			const fileInput = screen.getByTestId("file-input");
			await user.upload(fileInput, file);

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_1_UPLOAD, {
					applicationId: "app-123",
					currentStep: WizardStep.APPLICATION_DETAILS,
					fileName: "document.pdf",
					fileSize: 1_024_000,
					fileType: "application/pdf",
					organizationId: "org-123",
					projectId: "proj-123",
				});
			});
		});

		it("tracks file upload for step 3 (Knowledge Base)", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="application" />);

			const file = new File(["content"], "research.docx", {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			});
			Object.defineProperty(file, "size", { value: 2_048_000 });

			const fileInput = screen.getByTestId("file-input");
			await user.upload(fileInput, file);

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_3_UPLOAD, {
					currentStep: WizardStep.KNOWLEDGE_BASE,
					fileName: "research.docx",
					fileSize: 2_048_000,
					fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				});
			});
		});

		it("tracks multiple file uploads", async () => {
			// Mock addFile to resolve with a small delay to avoid debouncing
			mockAddFile.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(undefined), 10)));

			useOrganizationStore.setState({
				selectedOrganizationId: "org-123",
			});
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					id: "app-123",
					project_id: "proj-123",
				}),
			});
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const fileInput = screen.getByTestId("file-input");

			// Upload files one by one to avoid debouncing
			const file1 = new File(["content1"], "doc1.pdf", { type: "application/pdf" });
			Object.defineProperty(file1, "size", { value: 1_024_000 });
			await user.upload(fileInput, file1);

			// Wait longer than the 500ms debounce time
			await new Promise((resolve) => setTimeout(resolve, 600));

			const file2 = new File(["content2"], "doc2.pdf", { type: "application/pdf" });
			Object.defineProperty(file2, "size", { value: 2_048_000 });
			await user.upload(fileInput, file2);

			// Wait longer than the 500ms debounce time
			await new Promise((resolve) => setTimeout(resolve, 600));

			const file3 = new File(["content3"], "doc3.pdf", { type: "application/pdf" });
			Object.defineProperty(file3, "size", { value: 3_072_000 });
			await user.upload(fileInput, file3);

			await waitFor(() => {
				const { calls } = vi.mocked(segment.trackWizardEvent).mock;
				expect(calls).toHaveLength(3);

				// Check each file upload was tracked correctly
				expect(calls[0][0]).toBe(WizardAnalyticsEvent.STEP_1_UPLOAD);
				expect(calls[0][1]).toMatchObject({
					fileName: "doc1.pdf",
					fileSize: 1_024_000,
					fileType: "application/pdf",
				});

				expect(calls[1][0]).toBe(WizardAnalyticsEvent.STEP_1_UPLOAD);
				expect(calls[1][1]).toMatchObject({
					fileName: "doc2.pdf",
					fileSize: 2_048_000,
					fileType: "application/pdf",
				});

				expect(calls[2][0]).toBe(WizardAnalyticsEvent.STEP_1_UPLOAD);
				expect(calls[2][1]).toMatchObject({
					fileName: "doc3.pdf",
					fileSize: 3_072_000,
					fileType: "application/pdf",
				});
			});
		});

		it("does not track file upload when file is too large", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["content"], "huge.pdf", { type: "application/pdf" });
			Object.defineProperty(file, "size", { value: 105 * 1024 * 1024 });

			const fileInput = screen.getByTestId("file-input");
			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalled();
				expectNoEventsTracked();
			});
		});

		it("does not track file upload when organizationId is missing", async () => {
			useOrganizationStore.setState({
				selectedOrganizationId: null,
			});
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["content"], "document.pdf", { type: "application/pdf" });
			Object.defineProperty(file, "size", { value: 1_024_000 });

			const fileInput = screen.getByTestId("file-input");
			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockAddFile).toHaveBeenCalled();
				expectNoEventsTracked();
			});
		});

		it("does not track file upload when addFile fails", async () => {
			mockAddFile.mockRejectedValue(new Error("Upload failed"));
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<TemplateFileUploader parentId="parent-123" sourceType="template" />);

			const file = new File(["content"], "document.pdf", { type: "application/pdf" });
			Object.defineProperty(file, "size", { value: 1_024_000 });

			const fileInput = screen.getByTestId("file-input");
			await user.upload(fileInput, file);

			await waitFor(() => {
				expect(mockRemovePendingUpload).toHaveBeenCalled();
				expectEventTracked(WizardAnalyticsEvent.STEP_1_UPLOAD, {
					fileName: "document.pdf",
					fileSize: 1_024_000,
					fileType: "application/pdf",
				});
			});
		});
	});
});
