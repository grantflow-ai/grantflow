import { createNextRequest } from "::testing/utils";
import { faker } from "@faker-js/faker";
import { GET } from "./route";

const { mockVerifyOtp } = vi.hoisted(() => ({
	mockVerifyOtp: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn().mockReturnValue({
		auth: { verifyOtp: mockVerifyOtp },
	}),
}));

// this is required because the serverLogger declares 'use server';
vi.mock("@t3-oss/env-nextjs");
vi.mock("@/utils/env", () => ({
	getEnv: vi.fn().mockReturnValue({
		NEXT_PUBLIC_DEBUG: true,
	}),
}));

describe("MagicLink SignIn Route", () => {
	it("should return an error when the token_hash is missing", async () => {
		const nextRequest = createNextRequest("https://example.com");
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page
	});

	it("should handle a failure in OTP verification", async () => {
		mockVerifyOtp.mockResolvedValueOnce({
			error: new Error("Verification failed"),
		});
		const tokenHash = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?token_hash=${tokenHash}`);
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page on failure
	});

	it("should redirect to root on successful verification", async () => {
		mockVerifyOtp.mockResolvedValueOnce({ error: null });
		const tokenHash = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?token_hash=${tokenHash}`);
		const response = await GET(nextRequest);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toContain("/"); // Redirects to root page on success
	});
});
