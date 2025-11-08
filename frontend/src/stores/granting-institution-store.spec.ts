import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { resetAllStores } from "::testing/store-reset";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	crawlGrantingInstitutionUrl,
	createGrantingInstitutionUploadUrl,
	deleteGrantingInstitutionSource,
	getGrantingInstitution,
	getGrantingInstitutionSources,
} from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { extractObjectPathFromUrl, triggerDevIndexing } from "@/utils/dev-indexing-patch";
import { getEnv } from "@/utils/env";

import { useGrantingInstitutionStore } from "./granting-institution-store";

const createMockFileWithId = (name: string, id?: string): FileWithId => {
	const file = new File(["test content"], name, { type: "application/pdf" });
	return Object.assign(file, { id: id ?? crypto.randomUUID() });
};

const createMockInstitution = (): API.GetGrantingInstitution.Http200.ResponseBody => ({
	abbreviation: "NIH",
	created_at: "2024-01-01T00:00:00Z",
	full_name: "National Institutes of Health",
	id: "institution-123",
	source_count: 0,
	updated_at: "2024-01-01T00:00:00Z",
});

const createMockSources = (): API.RetrieveGrantingInstitutionRagSources.Http200.ResponseBody => [
	{
		created_at: "2024-01-01T00:00:00Z",
		filename: "guidelines.pdf",
		id: "source-1",
		indexing_status: "FINISHED",
		mime_type: "application/pdf",
		size: 1024,
	},
	{
		created_at: "2024-01-01T00:00:00Z",
		description: null,
		id: "source-2",
		indexing_status: "FINISHED",
		title: null,
		url: "https://example.com/info",
	},
];

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => {
	return {
		toastErrorMock: vi.fn(),
		toastSuccessMock: vi.fn(),
	};
});

vi.mock("@/actions/granting-institutions", () => ({
	crawlGrantingInstitutionUrl: vi.fn(),
	createGrantingInstitutionUploadUrl: vi.fn(() =>
		Promise.resolve({
			source_id: "source-123",
			url: "https://upload.url/path",
		}),
	),
	deleteGrantingInstitutionSource: vi.fn(),
	getGrantingInstitution: vi.fn(),
	getGrantingInstitutionSources: vi.fn(),
}));

vi.mock("@/utils/dev-indexing-patch", () => ({
	extractObjectPathFromUrl: vi.fn(),
	triggerDevIndexing: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(),
}));

import ky from "ky";

vi.mock("ky", () => ({
	default: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: toastErrorMock,
		success: toastSuccessMock,
	},
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("Granting Institution Store", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();

		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.mocked(getGrantingInstitution).mockReset();
		vi.mocked(getGrantingInstitutionSources).mockReset();
		vi.mocked(crawlGrantingInstitutionUrl).mockReset();
		vi.mocked(deleteGrantingInstitutionSource).mockReset();

		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8000",
			NEXT_PUBLIC_GCS_EMULATOR_URL: "http://localhost:4443",
		} as any);
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useGrantingInstitutionStore.getState();
			expect(state.institution).toBeNull();
			expect(state.isLoading).toBe(false);
			expect(state.pendingUploads.size).toBe(0);
			expect(state.sources).toEqual([]);
		});
	});

	describe("setInstitutionId", () => {
		it("should set institution with provided ID", () => {
			const { setInstitutionId } = useGrantingInstitutionStore.getState();

			setInstitutionId("institution-456");

			const state = useGrantingInstitutionStore.getState();
			expect(state.institution?.id).toBe("institution-456");
		});
	});

	describe("loadData", () => {
		it("should load institution and sources successfully", async () => {
			const institution = createMockInstitution();
			const sources = createMockSources();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue(sources);

			useGrantingInstitutionStore.setState({
				institution: { ...institution, id: "institution-123" } as any,
			});

			const { loadData } = useGrantingInstitutionStore.getState();

			await loadData();

			expect(getGrantingInstitution).toHaveBeenCalledWith("institution-123");
			expect(getGrantingInstitutionSources).toHaveBeenCalledWith("institution-123");

			const state = useGrantingInstitutionStore.getState();
			expect(state.institution).toEqual(institution);
			expect(state.sources).toEqual(sources);
			expect(state.isLoading).toBe(false);
		});

		it("should handle API errors gracefully", async () => {
			vi.mocked(getGrantingInstitution).mockRejectedValue(new Error("API Error"));

			useGrantingInstitutionStore.setState({
				institution: { id: "institution-123" } as any,
			});

			const { loadData } = useGrantingInstitutionStore.getState();

			await loadData();

			expect(toastErrorMock).toHaveBeenCalledWith("Failed to load granting institution");
			const state = useGrantingInstitutionStore.getState();
			expect(state.isLoading).toBe(false);
		});

		it("should not load data without institution ID", async () => {
			useGrantingInstitutionStore.getState().reset();

			const { loadData } = useGrantingInstitutionStore.getState();

			await loadData();

			expect(getGrantingInstitution).not.toHaveBeenCalled();
			expect(getGrantingInstitutionSources).not.toHaveBeenCalled();
		});
	});

	describe("file upload - development mode", () => {
		const originalNodeEnv = process.env.NODE_ENV;

		beforeEach(() => {
			(process.env as any).NODE_ENV = "development";

			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8000",
				NEXT_PUBLIC_GCS_EMULATOR_URL: "http://localhost:4443",
			} as any);

			vi.mocked(createGrantingInstitutionUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "http://gcs-emulator:4443/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=granting_institution/inst-123/src-123/test.pdf",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("granting_institution/inst-123/src-123/test.pdf");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(ky).mockResolvedValue({ ok: true } as any);
		});

		afterEach(() => {
			(process.env as any).NODE_ENV = originalNodeEnv;
		});

		it("should upload file using development workflow with emulator", async () => {
			const file = createMockFileWithId("test.pdf", "file-1");
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue([]);

			useGrantingInstitutionStore.setState({ institution });

			const { addFile } = useGrantingInstitutionStore.getState();

			await addFile(file);

			expect(extractObjectPathFromUrl).toHaveBeenCalled();
			expect(ky).toHaveBeenCalledWith(
				expect.stringContaining("http://localhost:4443/upload/storage/v1/b/grantflow-uploads/o"),
				expect.objectContaining({
					body: file,
					headers: {
						"Content-Type": file.type,
					},
					method: "POST",
				}),
			);

			await new Promise((resolve) => setTimeout(resolve, 600));
			expect(triggerDevIndexing).toHaveBeenCalled();

			expect(toastSuccessMock).toHaveBeenCalledWith("File test.pdf uploaded successfully");
		});

		it("should reload data after successful upload", async () => {
			const file = createMockFileWithId("test.pdf", "file-1");
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue([]);

			useGrantingInstitutionStore.setState({ institution });

			const { addFile } = useGrantingInstitutionStore.getState();

			await addFile(file);

			expect(getGrantingInstitution).toHaveBeenCalledWith(institution.id);
			expect(getGrantingInstitutionSources).toHaveBeenCalledWith(institution.id);
		});

		it("should handle upload errors", async () => {
			const file = createMockFileWithId("test.pdf", "file-1");
			const institution = createMockInstitution();

			vi.mocked(ky).mockRejectedValue(new Error("Upload failed"));

			useGrantingInstitutionStore.setState({ institution });

			const { addFile } = useGrantingInstitutionStore.getState();

			await expect(addFile(file)).rejects.toThrow();

			expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload file. Please try again.");
		});

		it("should not upload without institution ID", async () => {
			useGrantingInstitutionStore.getState().reset();

			const file = createMockFileWithId("test.pdf", "file-1");

			const { addFile } = useGrantingInstitutionStore.getState();

			await addFile(file);

			expect(ky).not.toHaveBeenCalled();
		});
	});

	describe("file upload - production mode", () => {
		beforeEach(() => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.grantflow.ai",
			} as any);

			vi.mocked(createGrantingInstitutionUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://storage.googleapis.com/signed-url",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("granting_institution/inst-123/src-123/test.pdf");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(ky).mockResolvedValue({ ok: true } as any);
		});

		it("should upload file using production workflow", async () => {
			const file = createMockFileWithId("test.pdf", "file-1");
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue([]);

			useGrantingInstitutionStore.setState({ institution });

			const { addFile } = useGrantingInstitutionStore.getState();

			await addFile(file);

			expect(ky).toHaveBeenCalledWith(
				"https://storage.googleapis.com/signed-url",
				expect.objectContaining({
					body: file,
					headers: {
						"Content-Type": file.type,
					},
					method: "PUT",
				}),
			);

			expect(toastSuccessMock).toHaveBeenCalledWith("File test.pdf uploaded successfully");
		});
	});

	describe("addUrl", () => {
		it("should add URL successfully", async () => {
			const institution = createMockInstitution();

			vi.mocked(crawlGrantingInstitutionUrl).mockResolvedValue({ source_id: "source-456" });
			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue([]);

			useGrantingInstitutionStore.setState({ institution });

			const { addUrl } = useGrantingInstitutionStore.getState();

			await addUrl("https://example.com");

			expect(crawlGrantingInstitutionUrl).toHaveBeenCalledWith(institution.id, "https://example.com");
			expect(toastSuccessMock).toHaveBeenCalledWith("URL added successfully");
			expect(getGrantingInstitution).toHaveBeenCalled();
		});

		it("should handle URL add errors", async () => {
			const institution = createMockInstitution();

			vi.mocked(crawlGrantingInstitutionUrl).mockRejectedValue(new Error("Crawl failed"));

			useGrantingInstitutionStore.setState({ institution });

			const { addUrl } = useGrantingInstitutionStore.getState();

			await expect(addUrl("https://example.com")).rejects.toThrow();

			expect(toastErrorMock).toHaveBeenCalledWith("Failed to add URL");
		});

		it("should not add URL without institution ID", async () => {
			useGrantingInstitutionStore.getState().reset();

			const { addUrl } = useGrantingInstitutionStore.getState();

			await addUrl("https://example.com");

			expect(crawlGrantingInstitutionUrl).not.toHaveBeenCalled();
		});
	});

	describe("deleteSource", () => {
		it("should delete source successfully", async () => {
			const institution = createMockInstitution();

			vi.mocked(deleteGrantingInstitutionSource).mockResolvedValue(undefined);
			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);
			vi.mocked(getGrantingInstitutionSources).mockResolvedValue([]);

			useGrantingInstitutionStore.setState({ institution });

			const { deleteSource } = useGrantingInstitutionStore.getState();

			await deleteSource("source-789");

			expect(deleteGrantingInstitutionSource).toHaveBeenCalledWith(institution.id, "source-789");
			expect(toastSuccessMock).toHaveBeenCalledWith("Source deleted successfully");
			expect(getGrantingInstitution).toHaveBeenCalled();
		});

		it("should handle delete errors", async () => {
			const institution = createMockInstitution();

			vi.mocked(deleteGrantingInstitutionSource).mockRejectedValue(new Error("Delete failed"));

			useGrantingInstitutionStore.setState({ institution });

			const { deleteSource } = useGrantingInstitutionStore.getState();

			await deleteSource("source-789");

			expect(toastErrorMock).toHaveBeenCalledWith("Failed to delete source");
		});

		it("should not delete source without institution ID", async () => {
			useGrantingInstitutionStore.getState().reset();

			const { deleteSource } = useGrantingInstitutionStore.getState();

			await deleteSource("source-789");

			expect(deleteGrantingInstitutionSource).not.toHaveBeenCalled();
		});
	});

	describe("pending uploads management", () => {
		describe("addPendingUpload", () => {
			it("should add file to pending uploads", () => {
				const file = createMockFileWithId("test.pdf", "file-1");
				const { addPendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file);

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.has(file)).toBe(true);
				expect(state.pendingUploads.size).toBe(1);
			});

			it("should add multiple files to pending uploads", () => {
				useGrantingInstitutionStore.getState().reset();

				const file1 = createMockFileWithId("test1.pdf", "file-1");
				const file2 = createMockFileWithId("test2.pdf", "file-2");
				const { addPendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file1);
				addPendingUpload(file2);

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(2);
				expect(state.pendingUploads.has(file1)).toBe(true);
				expect(state.pendingUploads.has(file2)).toBe(true);
			});

			it("should handle duplicate file additions", () => {
				useGrantingInstitutionStore.getState().reset();

				const file = createMockFileWithId("test.pdf", "file-1");
				const { addPendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file);
				addPendingUpload(file);

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(1);
			});
		});

		describe("removePendingUpload", () => {
			it("should remove file from pending uploads by ID", () => {
				useGrantingInstitutionStore.getState().reset();

				const file = createMockFileWithId("test.pdf", "file-1");
				const { addPendingUpload, removePendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file);
				expect(useGrantingInstitutionStore.getState().pendingUploads.size).toBe(1);

				removePendingUpload("file-1");

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(0);
				expect(state.pendingUploads.has(file)).toBe(false);
			});

			it("should handle non-existent file ID gracefully", () => {
				useGrantingInstitutionStore.getState().reset();

				const file = createMockFileWithId("test.pdf", "file-1");
				const { addPendingUpload, removePendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file);
				removePendingUpload("non-existent-id");

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(1);
				expect(state.pendingUploads.has(file)).toBe(true);
			});

			it("should remove only the specified file when multiple exist", () => {
				useGrantingInstitutionStore.getState().reset();

				const file1 = createMockFileWithId("test1.pdf", "file-1");
				const file2 = createMockFileWithId("test2.pdf", "file-2");
				const file3 = createMockFileWithId("test3.pdf", "file-3");
				const { addPendingUpload, removePendingUpload } = useGrantingInstitutionStore.getState();

				addPendingUpload(file1);
				addPendingUpload(file2);
				addPendingUpload(file3);

				removePendingUpload("file-2");

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(2);
				expect(state.pendingUploads.has(file1)).toBe(true);
				expect(state.pendingUploads.has(file2)).toBe(false);
				expect(state.pendingUploads.has(file3)).toBe(true);
			});
		});

		describe("clearPendingUploads", () => {
			it("should clear all pending uploads", () => {
				const file1 = createMockFileWithId("test1.pdf", "file-1");
				const file2 = createMockFileWithId("test2.pdf", "file-2");
				const { addPendingUpload, clearPendingUploads } = useGrantingInstitutionStore.getState();

				addPendingUpload(file1);
				addPendingUpload(file2);

				clearPendingUploads();

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(0);
			});

			it("should handle clearing empty pending uploads", () => {
				const { clearPendingUploads } = useGrantingInstitutionStore.getState();

				clearPendingUploads();

				const state = useGrantingInstitutionStore.getState();
				expect(state.pendingUploads.size).toBe(0);
			});
		});
	});

	describe("reset", () => {
		it("should reset all state to initial values", () => {
			const institution = createMockInstitution();
			const sources = createMockSources();
			const file = createMockFileWithId("test.pdf", "file-1");

			useGrantingInstitutionStore.setState({
				institution,
				isLoading: true,
				pendingUploads: new Set([file]),
				sources,
			});

			const { reset } = useGrantingInstitutionStore.getState();
			reset();

			const state = useGrantingInstitutionStore.getState();
			expect(state.institution).toBeNull();
			expect(state.isLoading).toBe(false);
			expect(state.pendingUploads.size).toBe(0);
			expect(state.sources).toEqual([]);
		});
	});

	describe("edge cases", () => {
		it("should maintain state immutability", () => {
			const file = createMockFileWithId("test.pdf", "file-1");
			const { addPendingUpload } = useGrantingInstitutionStore.getState();

			const initialState = useGrantingInstitutionStore.getState();
			const initialPendingUploads = initialState.pendingUploads;

			addPendingUpload(file);

			const newState = useGrantingInstitutionStore.getState();
			expect(newState.pendingUploads).not.toBe(initialPendingUploads);
		});

		it("should handle files with same name but different IDs", () => {
			useGrantingInstitutionStore.getState().reset();

			const file1 = createMockFileWithId("test.pdf", "file-1");
			const file2 = createMockFileWithId("test.pdf", "file-2");
			const { addPendingUpload } = useGrantingInstitutionStore.getState();

			addPendingUpload(file1);
			addPendingUpload(file2);

			const state = useGrantingInstitutionStore.getState();
			expect(state.pendingUploads.size).toBe(2);
			expect(state.pendingUploads.has(file1)).toBe(true);
			expect(state.pendingUploads.has(file2)).toBe(true);
		});
	});
});
