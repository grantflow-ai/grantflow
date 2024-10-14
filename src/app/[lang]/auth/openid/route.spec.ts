import { createNextRequest } from "::testing/utils";
import { faker } from "@faker-js/faker";
import { GET } from "./route";

const { mockExchangeCodeForSession } = vi.hoisted(() => ({
	mockExchangeCodeForSession: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn().mockReturnValue({
		auth: { exchangeCodeForSession: mockExchangeCodeForSession },
	}),
}));

describe("OpenID SignIn Route", () => {
	it("should return an error when the code is missing", async () => {
		const nextRequest = createNextRequest("https://example.com");
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page
	});

	it("should handle a failure in code exchange", async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({
			error: new Error("Exchange failed"),
		});
		const code = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?code=${code}`);
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page on failure
	});

	it("should redirect to root on successful code exchange", async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
		const code = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?code=${code}`);
		const response = await GET(nextRequest);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toContain("/"); // Redirects to root page on success
	});
});
