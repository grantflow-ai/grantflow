import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Mock } from "vitest";
import { deletePredefinedTemplate } from "@/actions/predefined-templates";
import { PredefinedTemplateList } from "@/components/admin/predefined-templates/predefined-template-list";
import type { API } from "@/types/api-types";

vi.mock("@/actions/predefined-templates", () => ({
	deletePredefinedTemplate: vi.fn(),
}));

const mockRouter = {
	push: vi.fn(),
	refresh: vi.fn(),
	replace: vi.fn(),
};

const toastSuccess = toast.success as unknown as Mock;
const toastError = toast.error as unknown as Mock;

const buildTemplate = (
	overrides: Partial<API.ListGrantingInstitutionPredefinedTemplates.Http200.ResponseBody[number]> = {},
) =>
	({
		activity_code: "R21",
		created_at: new Date().toISOString(),
		grant_type: "RESEARCH",
		granting_institution: {
			abbreviation: "NIH",
			full_name: "National Institutes of Health",
			id: "inst-1",
		},
		id: "tpl-1",
		name: "NIH Template",
		sections_count: 2,
		updated_at: new Date().toISOString(),
		...overrides,
	}) satisfies API.ListGrantingInstitutionPredefinedTemplates.Http200.ResponseBody[number];

describe("PredefinedTemplateList", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue(mockRouter as any);
		mockRouter.refresh.mockReset();
		mockRouter.push.mockReset();
		mockRouter.replace.mockReset();
		toastSuccess.mockClear();
		toastError.mockClear();
		vi.mocked(deletePredefinedTemplate).mockReset();
	});

	it("shows an empty state message", () => {
		render(<PredefinedTemplateList templates={[]} />);

		expect(screen.getByText("No predefined templates yet. Create one to seed the catalog.")).toBeInTheDocument();
	});

	it("renders template cards and handles deletion", async () => {
		const template = buildTemplate();
		vi.mocked(deletePredefinedTemplate).mockResolvedValue(undefined);

		render(<PredefinedTemplateList templates={[template]} />);

		expect(screen.getByText(template.name)).toBeInTheDocument();

		fireEvent.click(screen.getByTestId(`predefined-template-card-delete-${template.id}`));

		await waitFor(() => {
			expect(deletePredefinedTemplate).toHaveBeenCalledWith(template.id);
		});

		expect(mockRouter.refresh).toHaveBeenCalled();
		expect(toastSuccess).toHaveBeenCalledWith("Template deleted");
	});

	it("surfaces deletion errors", async () => {
		const template = buildTemplate();
		vi.mocked(deletePredefinedTemplate).mockRejectedValue(new Error("boom"));

		render(<PredefinedTemplateList templates={[template]} />);

		fireEvent.click(screen.getByTestId(`predefined-template-card-delete-${template.id}`));

		await waitFor(() => {
			expect(deletePredefinedTemplate).toHaveBeenCalledWith(template.id);
		});

		expect(toastError).toHaveBeenCalledWith("Failed to delete template");
	});
});
