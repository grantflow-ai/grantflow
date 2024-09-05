import { getS3Client } from "@/utils/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateUploadUrls } from "./file";

vi.mock("@/utils/s3", () => ({
	getS3Client: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
	PutObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn(),
}));

describe("S3 Upload URL Generation", () => {
	const mockS3Client = {};
	const mockSignedUrl = "https://mock-signed-url.com";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getS3Client).mockReturnValue(mockS3Client as any);
		vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("generateUploadUrls", () => {
		it("should generate upload URLs for given file IDs and MIME types", async () => {
			const fileIdsAndMimeTypes: [string, string][] = [
				["file1", "image/jpeg"],
				["file2", "application/pdf"],
			];

			const result = await generateUploadUrls(fileIdsAndMimeTypes);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(2);
			expect(result.get("file1")).toBe(mockSignedUrl);
			expect(result.get("file2")).toBe(mockSignedUrl);
		});

		it("should call PutObjectCommand with correct parameters", async () => {
			const fileIdsAndMimeTypes: [string, string][] = [["file1", "image/jpeg"]];

			await generateUploadUrls(fileIdsAndMimeTypes);

			expect(PutObjectCommand).toHaveBeenCalledWith({
				Bucket: "bucketName",
				Key: "file1",
				ContentType: "image/jpeg",
			});
		});

		it("should call getSignedUrl with correct parameters", async () => {
			const fileIdsAndMimeTypes: [string, string][] = [["file1", "image/jpeg"]];

			await generateUploadUrls(fileIdsAndMimeTypes);

			expect(getSignedUrl).toHaveBeenCalledWith(mockS3Client, expect.any(PutObjectCommand), { expiresIn: 600 });
		});

		it("should handle empty input array", async () => {
			const result = await generateUploadUrls([]);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it("should handle multiple file IDs and MIME types", async () => {
			const fileIdsAndMimeTypes: [string, string][] = [
				["file1", "image/jpeg"],
				["file2", "application/pdf"],
				["file3", "text/plain"],
			];

			const result = await generateUploadUrls(fileIdsAndMimeTypes);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(3);
			expect(result.get("file1")).toBe(mockSignedUrl);
			expect(result.get("file2")).toBe(mockSignedUrl);
			expect(result.get("file3")).toBe(mockSignedUrl);
		});
	});
});
