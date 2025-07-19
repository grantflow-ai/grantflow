import { describe, expect, it, vi } from "vitest";
import * as grantingInstitutionsActions from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";

// Mock all granting institutions actions
vi.mock("@/actions/granting-institutions");

describe("Granting Institutions API Actions", () => {
	const mockInstitutionId = "123e4567-e89b-12d3-a456-426614174000";

	describe("Global Granting Institutions Management", () => {
		it("should get all granting institutions", async () => {
			const expectedResponse = [
				{
					created_at: "2023-01-01T00:00:00Z",
					description: "Federal funding agency",
					id: mockInstitutionId,
					name: "National Science Foundation",
					website_url: "https://nsf.gov",
				},
			];
			vi.mocked(grantingInstitutionsActions.getGrantingInstitutions).mockResolvedValue(expectedResponse);

			const result = await grantingInstitutionsActions.getGrantingInstitutions();

			expect(grantingInstitutionsActions.getGrantingInstitutions).toHaveBeenCalled();
			expect(result).toEqual(expectedResponse);
		});

		it("should create granting institution", async () => {
			const createData: API.CreateGrantingInstitution.RequestBody = {
				description: "A new funding agency",
				name: "New Foundation",
				website_url: "https://newfoundation.org",
			};
			const expectedResponse = {
				id: mockInstitutionId,
				...createData,
				created_at: "2023-01-01T00:00:00Z",
			};
			vi.mocked(grantingInstitutionsActions.createGrantingInstitution).mockResolvedValue(expectedResponse);

			const result = await grantingInstitutionsActions.createGrantingInstitution(createData);

			expect(grantingInstitutionsActions.createGrantingInstitution).toHaveBeenCalledWith(createData);
			expect(result).toEqual(expectedResponse);
		});

		it("should update granting institution", async () => {
			const updateData: API.UpdateGrantingInstitution.RequestBody = {
				description: "Updated description",
				name: "Updated Foundation Name",
			};
			const expectedResponse = {
				created_at: "2023-01-01T00:00:00Z",
				description: "Updated description",
				id: mockInstitutionId,
				name: "Updated Foundation Name",
				website_url: "https://newfoundation.org",
			};
			vi.mocked(grantingInstitutionsActions.updateGrantingInstitution).mockResolvedValue(expectedResponse);

			const result = await grantingInstitutionsActions.updateGrantingInstitution(mockInstitutionId, updateData);

			expect(grantingInstitutionsActions.updateGrantingInstitution).toHaveBeenCalledWith(
				mockInstitutionId,
				updateData,
			);
			expect(result).toEqual(expectedResponse);
		});

		it("should delete granting institution", async () => {
			const expectedResponse = { success: true };
			vi.mocked(grantingInstitutionsActions.deleteGrantingInstitution).mockResolvedValue(expectedResponse);

			const result = await grantingInstitutionsActions.deleteGrantingInstitution(mockInstitutionId);

			expect(grantingInstitutionsActions.deleteGrantingInstitution).toHaveBeenCalledWith(mockInstitutionId);
			expect(result).toEqual(expectedResponse);
		});
	});
});
