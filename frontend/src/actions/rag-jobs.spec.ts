import { HTTPError } from "ky";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { retrieveRagJob } from "./rag-jobs";

const mockGet = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		getClient: () => ({
			get: mockGet,
		}),
	};
});

vi.mock("@/utils/server-side", async () => {
	const actual = await vi.importActual("@/utils/server-side");
	return {
		...actual,
		createAuthHeaders: () => mockCreateAuthHeaders(),
		withAuthRedirect: (promise: Promise<any>) => mockWithAuthRedirect(promise),
	};
});

describe("rag-jobs server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("retrieveRagJob", () => {
		it("should retrieve a rag job successfully", async () => {
			const mockWorkspaceId = "workspace-123e4567-e89b-12d3-a456-426614174000";
			const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
			const mockResponse = {
				created_at: "2024-01-01T00:00:00Z",
				current_stage: 2,
				grant_template_id: "456e7890-e89b-12d3-a456-426614174000",
				id: mockJobId,
				job_type: "grant_template_generation",
				retry_count: 0,
				status: "PROCESSING",
				total_stages: 4,
				updated_at: "2024-01-01T00:01:00Z",
			};

			mockGet.mockReturnValue({ json: vi.fn().mockResolvedValue(mockResponse) });
			mockWithAuthRedirect.mockImplementation((promise) => promise);

			const result = await retrieveRagJob(mockWorkspaceId, mockJobId);

			expect(mockGet).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/rag-jobs/${mockJobId}`,
				expect.objectContaining({
					headers: undefined,
				}),
			);
			expect(result).toEqual(mockResponse);
		});

		it("should handle application generation job response", async () => {
			const mockWorkspaceId = "workspace-789e0123-e89b-12d3-a456-426614174000";
			const mockJobId = "789e0123-e89b-12d3-a456-426614174000";
			const mockResponse = {
				completed_at: "2024-01-01T00:05:00Z",
				created_at: "2024-01-01T00:00:00Z",
				current_stage: 5,
				generated_sections: {
					introduction: "This is the introduction...",
					methodology: "The methodology involves...",
				},
				grant_application_id: "321e0987-e89b-12d3-a456-426614174000",
				id: mockJobId,
				job_type: "grant_application_generation",
				retry_count: 0,
				status: "COMPLETED",
				total_stages: 5,
				updated_at: "2024-01-01T00:05:00Z",
				validation_results: {
					is_valid: true,
					score: 0.95,
				},
			};

			mockGet.mockReturnValue({ json: vi.fn().mockResolvedValue(mockResponse) });
			mockWithAuthRedirect.mockImplementation((promise) => promise);

			const result = await retrieveRagJob(mockWorkspaceId, mockJobId);

			expect(mockGet).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/rag-jobs/${mockJobId}`,
				expect.objectContaining({
					headers: undefined,
				}),
			);
			expect(result).toEqual(mockResponse);
			expect(result.generated_sections).toBeDefined();
			expect(result.validation_results).toBeDefined();
		});

		it("should handle failed job with error details", async () => {
			const mockWorkspaceId = "workspace-abc12345-e89b-12d3-a456-426614174000";
			const mockJobId = "abc12345-e89b-12d3-a456-426614174000";
			const mockResponse = {
				created_at: "2024-01-01T00:00:00Z",
				current_stage: 1,
				error_details: {
					details: "Invalid PDF format",
					error_type: "ExtractionError",
				},
				error_message: "Failed to extract sections",
				failed_at: "2024-01-01T00:03:00Z",
				id: mockJobId,
				job_type: "grant_template_generation",
				retry_count: 3,
				status: "FAILED",
				total_stages: 4,
				updated_at: "2024-01-01T00:03:00Z",
			};

			mockGet.mockReturnValue({ json: vi.fn().mockResolvedValue(mockResponse) });
			mockWithAuthRedirect.mockImplementation((promise) => promise);

			const result = await retrieveRagJob(mockWorkspaceId, mockJobId);

			expect(mockGet).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/rag-jobs/${mockJobId}`,
				expect.objectContaining({
					headers: undefined,
				}),
			);
			expect(result).toEqual(mockResponse);
			expect(result.error_message).toBe("Failed to extract sections");
			expect(result.error_details).toEqual({
				details: "Invalid PDF format",
				error_type: "ExtractionError",
			});
		});

		it("should handle 404 error when job not found", async () => {
			const mockWorkspaceId = "workspace-nonexistent";
			const mockJobId = "nonexistent-job-id";
			const errorResponse = {
				detail: "RAG job not found",
				status_code: 404,
			};

			const error = new HTTPError(
				new Response(JSON.stringify(errorResponse), {
					headers: { "Content-Type": "application/json" },
					status: 404,
				}),
				{} as any,
				{} as any,
			);

			mockGet.mockReturnValue({ json: vi.fn().mockRejectedValue(error) });
			mockWithAuthRedirect.mockImplementation((promise) => promise);

			await expect(retrieveRagJob(mockWorkspaceId, mockJobId)).rejects.toThrow(HTTPError);
		});
	});
});
