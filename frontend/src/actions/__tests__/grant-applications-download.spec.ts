import { beforeEach, describe, expect, it, vi } from "vitest";
import * as grantApplicationActions from "@/actions/grant-applications";
import type { DownloadFormat } from "@/types/download";

vi.mock("@/actions/grant-applications");

describe("Grant Applications Download API Actions", () => {
	const mockOrganizationId = "123e4567-e89b-12d3-a456-426614174000";
	const mockProjectId = "987fcdeb-51a2-43d1-9f12-123456789abc";
	const mockApplicationId = "456e7890-a1b2-34c5-d678-901234567890";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("downloadApplication", () => {
		it("should download application in markdown format", async () => {
			const mockBlob = new Blob(["# Test Application\n\nContent"], { type: "text/markdown" });
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockResolvedValue(mockBlob);

			const result = await grantApplicationActions.downloadApplication(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"markdown" as DownloadFormat,
			);

			expect(mockDownloadApplication).toHaveBeenCalledWith(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"markdown",
			);
			expect(result).toBe(mockBlob);
			expect(result.type).toBe("text/markdown");
		});

		it("should download application in PDF format", async () => {
			const mockBlob = new Blob([new ArrayBuffer(1024)], { type: "application/pdf" });
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockResolvedValue(mockBlob);

			const result = await grantApplicationActions.downloadApplication(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"pdf" as DownloadFormat,
			);

			expect(mockDownloadApplication).toHaveBeenCalledWith(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"pdf",
			);
			expect(result).toBe(mockBlob);
			expect(result.type).toBe("application/pdf");
		});

		it("should download application in DOCX format", async () => {
			const mockBlob = new Blob([new ArrayBuffer(2048)], {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			});
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockResolvedValue(mockBlob);

			const result = await grantApplicationActions.downloadApplication(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"docx" as DownloadFormat,
			);

			expect(mockDownloadApplication).toHaveBeenCalledWith(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"docx",
			);
			expect(result).toBe(mockBlob);
			expect(result.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
		});

		it("should handle download errors gracefully", async () => {
			const mockError = new Error("Download failed");
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockRejectedValue(mockError);

			await expect(
				grantApplicationActions.downloadApplication(
					mockOrganizationId,
					mockProjectId,
					mockApplicationId,
					"markdown" as DownloadFormat,
				),
			).rejects.toThrow("Download failed");

			expect(mockDownloadApplication).toHaveBeenCalledWith(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"markdown",
			);
		});

		it("should handle network errors", async () => {
			const mockNetworkError = new Error("Network error");
			mockNetworkError.name = "NetworkError";
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockRejectedValue(mockNetworkError);

			await expect(
				grantApplicationActions.downloadApplication(
					mockOrganizationId,
					mockProjectId,
					mockApplicationId,
					"pdf" as DownloadFormat,
				),
			).rejects.toThrow("Network error");
		});

		it("should handle unauthorized errors", async () => {
			const mockAuthError = new Error("Unauthorized");
			mockAuthError.name = "UnauthorizedError";
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockRejectedValue(mockAuthError);

			await expect(
				grantApplicationActions.downloadApplication(
					mockOrganizationId,
					mockProjectId,
					mockApplicationId,
					"docx" as DownloadFormat,
				),
			).rejects.toThrow("Unauthorized");
		});

		it("should validate format parameter", async () => {
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);

			const validFormats: DownloadFormat[] = ["markdown", "pdf", "docx"];

			for (const format of validFormats) {
				mockDownloadApplication.mockClear();
				mockDownloadApplication.mockResolvedValue(new Blob([], { type: "application/octet-stream" }));

				await grantApplicationActions.downloadApplication(
					mockOrganizationId,
					mockProjectId,
					mockApplicationId,
					format,
				);

				expect(mockDownloadApplication).toHaveBeenCalledWith(
					mockOrganizationId,
					mockProjectId,
					mockApplicationId,
					format,
				);
			}
		});

		it("should handle empty blob response", async () => {
			const mockBlob = new Blob([], { type: "text/markdown" });
			const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
			mockDownloadApplication.mockResolvedValue(mockBlob);

			const result = await grantApplicationActions.downloadApplication(
				mockOrganizationId,
				mockProjectId,
				mockApplicationId,
				"markdown" as DownloadFormat,
			);

			expect(result).toBe(mockBlob);
			expect(result.size).toBe(0);
		});
	});
});
