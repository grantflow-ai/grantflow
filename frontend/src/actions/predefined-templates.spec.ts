import { HTTPError } from "ky";
import type { API } from "@/types/api-types";
import {
	createPredefinedTemplate,
	deletePredefinedTemplate,
	getPredefinedTemplate,
	listPredefinedTemplates,
	updatePredefinedTemplate,
} from "./predefined-templates";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api/server", async () => {
	const actual = await vi.importActual("@/utils/api/server");
	return {
		...actual,
		getClient: () => ({
			delete: mockDelete,
			get: mockGet,
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
		withAuthRedirect: <T>(promise: Promise<T>) => {
			mockWithAuthRedirect(promise);
			return promise;
		},
	};
});

const mockAuthHeaders = { Authorization: "Bearer mock-token" };

const sampleTemplate: API.GetPredefinedGrantTemplate.Http200.ResponseBody = {
	activity_code: "R21",
	additional_metadata: null,
	created_at: new Date().toISOString(),
	description: "Sample",
	grant_sections: [],
	grant_type: "RESEARCH",
	granting_institution: {
		abbreviation: "NIH",
		full_name: "National Institutes of Health",
		id: "inst-123",
	},
	guideline_hash: null,
	guideline_source: null,
	guideline_version: null,
	id: "tpl-123",
	name: "Template",
	sections_count: 0,
	updated_at: new Date().toISOString(),
};

beforeEach(() => {
	vi.clearAllMocks();

	mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
	mockWithAuthRedirect.mockImplementation((promise) => promise);

	mockGet.mockReturnValue({ json: vi.fn().mockResolvedValue([sampleTemplate]) });
	mockPost.mockReturnValue({ json: vi.fn().mockResolvedValue(sampleTemplate) });
	mockPatch.mockReturnValue({ json: vi.fn().mockResolvedValue(sampleTemplate) });
	mockDelete.mockReturnValue({ json: vi.fn().mockResolvedValue(undefined) });
});

describe("predefined template actions", () => {
	describe("listPredefinedTemplates", () => {
		it("calls the API without filters", async () => {
			await listPredefinedTemplates();

			expect(mockGet).toHaveBeenCalledWith("/predefined-templates", {
				headers: mockAuthHeaders,
			});
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("applies query parameters when filters are provided", async () => {
			await listPredefinedTemplates({ activityCode: "R21", grantingInstitutionId: "inst-1" });

			expect(mockGet).toHaveBeenCalledWith(
				"/predefined-templates?granting_institution_id=inst-1&activity_code=R21",
				{
					headers: mockAuthHeaders,
				},
			);
		});
	});

	describe("getPredefinedTemplate", () => {
		it("requests a single template", async () => {
			await getPredefinedTemplate("tpl-123");

			expect(mockGet).toHaveBeenCalledWith("/predefined-templates/tpl-123", {
				headers: mockAuthHeaders,
			});
		});
	});

	describe("createPredefinedTemplate", () => {
		it("posts the payload", async () => {
			const payload = {
				activity_code: "R21",
				grant_sections: [],
				grant_type: "RESEARCH",
				granting_institution_id: "inst-123",
				name: "New Template",
			} satisfies Partial<API.CreatePredefinedGrantTemplate.RequestBody>;

			await createPredefinedTemplate(payload as API.CreatePredefinedGrantTemplate.RequestBody);

			expect(mockPost).toHaveBeenCalledWith("/predefined-templates", {
				headers: mockAuthHeaders,
				json: payload,
			});
		});
	});

	describe("updatePredefinedTemplate", () => {
		it("patches the resource", async () => {
			const payload: API.UpdatePredefinedGrantTemplate.RequestBody = {
				description: "Updated",
				grant_sections: [],
			};

			await updatePredefinedTemplate("tpl-123", payload);

			expect(mockPatch).toHaveBeenCalledWith("/predefined-templates/tpl-123", {
				headers: mockAuthHeaders,
				json: payload,
			});
		});
	});

	describe("deletePredefinedTemplate", () => {
		it("deletes the template", async () => {
			await deletePredefinedTemplate("tpl-123");

			expect(mockDelete).toHaveBeenCalledWith("/predefined-templates/tpl-123", {
				headers: mockAuthHeaders,
			});
		});

		it("propagates API errors", async () => {
			const error = new HTTPError(new Response(null, { status: 500 }), {} as any, {} as any);
			mockDelete.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(error),
			});

			await expect(deletePredefinedTemplate("tpl-123")).rejects.toBe(error);
		});
	});
});
