import { getEnv } from "@/utils/env";

describe("getEnv (client side)", () => {
	// we cannot test the server side because the env is not available when window is defined
	it("should return valid environment variables", () => {
		const env = getEnv();

		expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
		expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("valid_key");
		expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://supabase.co");
		expect(env.NEXT_PUBLIC_DEBUG).toBe(true);
	});
});
