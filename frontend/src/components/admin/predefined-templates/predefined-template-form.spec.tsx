import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import type { Mock } from "vitest";
import { createPredefinedTemplate, updatePredefinedTemplate } from "@/actions/predefined-templates";
import {
	PREDEFINED_TEMPLATE_FORM_MODE,
	PredefinedTemplateForm,
	type PredefinedTemplateFormMode,
} from "@/components/admin/predefined-templates/predefined-template-form";
import type { API } from "@/types/api-types";

vi.mock("@/actions/predefined-templates", () => ({
	createPredefinedTemplate: vi.fn(),
	deletePredefinedTemplate: vi.fn(),
	updatePredefinedTemplate: vi.fn(),
}));

const mockCreate = vi.mocked(createPredefinedTemplate);
const mockUpdate = vi.mocked(updatePredefinedTemplate);
const toastError = toast.error as unknown as Mock;

const institutions: API.ListGrantingInstitutions.Http200.ResponseBody = [
	{
		abbreviation: "NIH",
		full_name: "National Institutes of Health",
		id: "inst-1",
	},
] as unknown as API.ListGrantingInstitutions.Http200.ResponseBody;

const renderForm = (
	mode: PredefinedTemplateFormMode,
	initialTemplate?: API.GetPredefinedGrantTemplate.Http200.ResponseBody,
) => render(<PredefinedTemplateForm initialTemplate={initialTemplate} institutions={institutions} mode={mode} />);

describe("PredefinedTemplateForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		toastError.mockClear();
	});

	it("creates a new predefined template", async () => {
		renderForm(PREDEFINED_TEMPLATE_FORM_MODE.CREATE);

		fireEvent.change(screen.getByTestId("template-name-input"), { target: { value: "NIH R21 Template" } });
		fireEvent.change(screen.getByTestId("template-activity-code-input"), { target: { value: "R21" } });
		fireEvent.change(screen.getByTestId("template-guideline-source-input"), { target: { value: "Forms-H" } });
		fireEvent.change(screen.getByTestId("template-guideline-version-input"), { target: { value: "v1" } });
		fireEvent.change(screen.getByPlaceholderText("Short summary of when to use this template"), {
			target: { value: "Detailed description" },
		});

		fireEvent.submit(screen.getByTestId("predefined-template-form"));

		await waitFor(() => {
			expect(mockCreate).toHaveBeenCalled();
		});

		const [[payload]] = mockCreate.mock.calls;
		expect(payload.name).toBe("NIH R21 Template");
		expect(payload.activity_code).toBe("R21");
		expect(payload.grant_sections.length).toBeGreaterThan(0);
	});

	it("updates an existing template", async () => {
		const template: API.GetPredefinedGrantTemplate.Http200.ResponseBody = {
			activity_code: "R01",
			additional_metadata: null,
			created_at: new Date().toISOString(),
			description: "Existing",
			grant_sections: [
				{
					depends_on: [],
					evidence: "",
					generation_instructions: "",
					id: "section-1",
					is_clinical_trial: null,
					is_detailed_research_plan: false,
					keywords: [],
					length_constraint: { source: null, type: "words", value: 500 },
					order: 0,
					parent_id: null,
					search_queries: [],
					title: "Existing Section",
					topics: [],
				},
			],
			grant_type: "RESEARCH",
			granting_institution: {
				abbreviation: "NIH",
				full_name: "National Institutes of Health",
				id: "inst-1",
			},
			guideline_hash: null,
			guideline_source: null,
			guideline_version: null,
			id: "tpl-1",
			name: "Existing Template",
			sections_count: 1,
			updated_at: new Date().toISOString(),
		};

		renderForm(PREDEFINED_TEMPLATE_FORM_MODE.EDIT, template);

		fireEvent.change(screen.getByTestId("template-name-input"), { target: { value: "Updated Template" } });
		fireEvent.submit(screen.getByTestId("predefined-template-form"));

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith(
				"tpl-1",
				expect.objectContaining({
					grant_sections: expect.arrayContaining([
						expect.objectContaining({ id: "section-1", title: "Existing Section" }),
					]),
					name: "Updated Template",
				}),
			);
		});
	});

	it("shows an error when no institution is selected", async () => {
		render(
			<PredefinedTemplateForm
				institutions={[] as unknown as API.ListGrantingInstitutions.Http200.ResponseBody}
				mode={PREDEFINED_TEMPLATE_FORM_MODE.CREATE}
			/>,
		);

		fireEvent.submit(screen.getByTestId("predefined-template-form"));

		await waitFor(() => {
			expect(toastError).toHaveBeenCalledWith("Select a granting institution before saving");
		});
		expect(mockCreate).not.toHaveBeenCalled();
	});
});
