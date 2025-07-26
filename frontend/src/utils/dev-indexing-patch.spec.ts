import { describe, expect, it } from "vitest";

import { extractObjectPathFromUrl } from "./dev-indexing-patch";

describe("dev-indexing-patch", () => {
	describe("extractObjectPathFromUrl", () => {
		it("should extract object path from name query parameter", () => {
			const url = "https://storage.googleapis.com/bucket?name=organization/123/file.pdf&other=param";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/file.pdf");
		});

		it("should extract object path from /o/ URL pattern", () => {
			const url =
				"https://storage.googleapis.com/storage/v1/b/bucket/o/organization%2F123%2Ffile.pdf?uploadType=media";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/file.pdf");
		});

		it("should extract object path from pathname (direct bucket access)", () => {
			const url =
				"https://storage.googleapis.com/grantflow-staging-uploads/organization/41aab27c-2406-4d60-bd7e-bf811b7d7620/bb0edc17-df47-438d-9dce-d6e5459cf4ab/25%20Review%20Qus%20for%20Trader.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe(
				"organization/41aab27c-2406-4d60-bd7e-bf811b7d7620/bb0edc17-df47-438d-9dce-d6e5459cf4ab/25 Review Qus for Trader.pdf",
			);
		});

		it("should decode URL-encoded characters in object path", () => {
			const url = "https://storage.googleapis.com/bucket/path%2Fto%2Ffile%20with%20spaces.pdf";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("path/to/file with spaces.pdf");
		});

		it("should handle URLs with special characters", () => {
			const url =
				"https://storage.googleapis.com/bucket/organization/123/Cultivated%20Culture%27s%20Rapid%20Referral%20Checklist.pdf";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/Cultivated Culture's Rapid Referral Checklist.pdf");
		});

		it("should return null for invalid URLs", () => {
			const invalidUrl = "not-a-valid-url";

			const result = extractObjectPathFromUrl(invalidUrl);

			expect(result).toBeNull();
		});

		it("should return null when no path can be extracted", () => {
			const url = "https://example.com/";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBeNull();
		});

		it("should return null for empty pathname", () => {
			const url = "https://storage.googleapis.com/";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBeNull();
		});

		it("should handle pathname with only bucket name", () => {
			const url = "https://storage.googleapis.com/bucket-only/";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBeNull();
		});

		it("should prefer name parameter over other extraction methods", () => {
			const url = "https://storage.googleapis.com/bucket/other/path?name=organization/123/file.pdf";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/file.pdf");
		});

		it("should try /o/ pattern when name parameter is not present", () => {
			const url = "https://storage.googleapis.com/storage/v1/b/bucket/o/organization%2F123%2Ffile.pdf";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/file.pdf");
		});

		it("should try pathname parsing as fallback", () => {
			const url = "https://storage.googleapis.com/bucket/organization/123/file.pdf";

			const result = extractObjectPathFromUrl(url);

			expect(result).toBe("organization/123/file.pdf");
		});
	});
});
