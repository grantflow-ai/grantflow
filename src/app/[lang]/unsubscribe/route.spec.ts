import { createNextRequest } from "::testing/utils";
import { faker } from "@faker-js/faker";
import { GET } from "./route";

const { mockEq, mockDelete } = vi.hoisted(() => ({
	mockEq: vi.fn(),
	mockDelete: vi.fn().mockReturnThis(),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({ delete: mockDelete, eq: mockEq }),
	}),
}));

describe("Unsubscribe Route", () => {
	it("should delete a record when passed the record-id", async () => {
		const recordId = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?record-id=${recordId}`);
		const response = await GET(nextRequest);
		expect(mockEq).toHaveBeenCalledWith("id", recordId);
		expect(response.status).toBe(307);
	});

	it("should return an error when the record-id is missing", async () => {
		const nextRequest = createNextRequest("https://example.com");
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page
	});

	it("should handle a failure in database deletion", async () => {
		mockDelete.mockRejectedValueOnce(new Error("Deletion failed"));
		const recordId = faker.string.uuid();
		const nextRequest = createNextRequest(`https://example.com?record-id=${recordId}`);
		const response = await GET(nextRequest);
		expect(response.status).toBe(307); // Assuming error redirect response is 307
		expect(response.headers.get("location")).toContain("/auth"); // Redirects to auth page on failure
	});
});
