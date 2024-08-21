import { getEnv } from "@/utils/env";

import { urlWithHost } from "./url";

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(),
}));

describe("getUrl", () => {
	it("should return the correct URL when given a path without leading slashes", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_SITE_URL: "https://example.com",
		} as any);
		const result = urlWithHost("test-path");
		expect(result).toBe("https://example.com/test-path");
	});

	it("should remove leading slashes from the path", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_SITE_URL: "https://example.com",
		} as any);
		const result = urlWithHost("///test-path");
		expect(result).toBe("https://example.com/test-path");
	});

	it("should work with an empty path", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_SITE_URL: "https://example.com",
		} as any);
		const result = urlWithHost("");
		expect(result).toBe("https://example.com/");
	});

	it("should work with different NEXT_PUBLIC_SITE_URL values", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_SITE_URL: "https://another-example.com",
		} as any);
		const result = urlWithHost("test-path");
		expect(result).toBe("https://another-example.com/test-path");
	});

	it("should handle paths with query parameters", () => {
		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_SITE_URL: "https://example.com",
		} as any);
		const result = urlWithHost("test-path?param1=value1&param2=value2");
		expect(result).toBe("https://example.com/test-path?param1=value1&param2=value2");
	});
});
