import { GrantSectionDetailedFactory, UpdateGrantTemplateRequestFactory } from "::testing/factories";
import { HTTPError } from "ky";
import type { API } from "@/types/api-types";
import { generateGrantTemplate, updateGrantTemplate } from "./grant-template";

const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		getClient: () => ({
			patch: mockPatch,
			post: mockPost,
		}),
	};
});

vi.mock("@/utils/server-side", async () => {
	const actual = await vi.importActual("@/utils/server-side");
	return {
		...actual,
		createAuthHeaders: () => mockCreateAuthHeaders(),
		withAuthRedirect: (promise: Promise<any>) => mockWithAuthRedirect(promise),
	};
});

const mockWorkspaceId = "mock-workspace-id";
const mockApplicationId = "mock-application-id";
const mockTemplateId = "mock-template-id";
const mockAuthHeaders = { Authorization: "Bearer mock-token" };

beforeEach(() => {
	vi.clearAllMocks();

	mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
	mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

	mockPost.mockResolvedValue(undefined);
	mockPatch.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("Grant Template Actions", () => {
	describe("generateGrantTemplate", () => {
		it("should call the API with correct parameters", async () => {
			await generateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId);

			expect(mockPost).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				{
					headers: mockAuthHeaders,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("updateGrantTemplate", () => {
		it("should call the API with correct parameters", async () => {
			const updateData = UpdateGrantTemplateRequestFactory.build({
				grant_sections: [
					GrantSectionDetailedFactory.build({
						depends_on: [],
						generation_instructions: "Write an introduction",
						id: "section1",
						is_clinical_trial: false,
						is_detailed_workplan: false,
						keywords: ["intro", "background"],
						max_words: 500,
						order: 1,
						parent_id: null,
						search_queries: ["introduction research"],
						title: "Introduction",
						topics: ["research background"],
					}),
				],
				submission_date: "2024-12-31",
			});

			await updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				{
					headers: mockAuthHeaders,
					json: updateData,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle partial updates", async () => {
			const partialUpdateData: Partial<API.UpdateGrantTemplate.RequestBody> = {
				submission_date: "2024-12-31",
			};

			await updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, partialUpdateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				{
					headers: mockAuthHeaders,
					json: partialUpdateData,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should propagate API errors", async () => {
			const mockResponse = new Response();
			const mockError = new HTTPError(
				mockResponse,
				{
					path: `workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				} as any,
				{} as any,
			);

			mockPost.mockRejectedValue(mockError);
			mockWithAuthRedirect.mockRejectedValue(mockError);

			await expect(generateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId)).rejects.toThrow();
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle API errors for update operations", async () => {
			const mockResponse = new Response();
			const mockError = new HTTPError(
				mockResponse,
				{
					path: `workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				} as any,
				{} as any,
			);

			mockPatch.mockRejectedValue(mockError);
			mockWithAuthRedirect.mockRejectedValue(mockError);

			const updateData: Partial<API.UpdateGrantTemplate.RequestBody> = {
				submission_date: "2024-12-31",
			};

			await expect(
				updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, updateData),
			).rejects.toThrow();
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});
});
