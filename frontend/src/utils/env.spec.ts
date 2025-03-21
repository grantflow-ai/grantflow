import { getEnv } from "@/utils/env";

describe("getEnv (client side)", () => {
	it("should return valid environment variables", () => {
		const env = getEnv();

		expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
		expect(env.NEXT_PUBLIC_DEBUG).toBe(true);
	});
});
