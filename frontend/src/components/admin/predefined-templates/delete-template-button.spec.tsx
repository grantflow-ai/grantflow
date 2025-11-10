import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Mock } from "vitest";
import { deletePredefinedTemplate } from "@/actions/predefined-templates";
import { DeletePredefinedTemplateButton } from "@/components/admin/predefined-templates/delete-template-button";
import { routes } from "@/utils/navigation";

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

describe("DeletePredefinedTemplateButton", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue(mockRouter as any);
		mockRouter.push.mockReset();
		mockRouter.refresh.mockReset();
		mockRouter.replace.mockReset();
		toastSuccess.mockClear();
		toastError.mockClear();
		vi.mocked(deletePredefinedTemplate).mockReset();
	});

	it("deletes the template and redirects to the list", async () => {
		vi.mocked(deletePredefinedTemplate).mockResolvedValue(undefined);

		render(<DeletePredefinedTemplateButton templateId="tpl-1" />);

		fireEvent.click(screen.getByTestId("predefined-template-delete"));

		await waitFor(() => {
			expect(deletePredefinedTemplate).toHaveBeenCalledWith("tpl-1");
		});

		expect(mockRouter.push).toHaveBeenCalledWith(routes.admin.predefinedTemplates.list());
		expect(toastSuccess).toHaveBeenCalledWith("Template deleted");
	});

	it("shows an error toast when deletion fails", async () => {
		vi.mocked(deletePredefinedTemplate).mockRejectedValue(new Error("boom"));

		render(<DeletePredefinedTemplateButton templateId="tpl-1" />);

		fireEvent.click(screen.getByTestId("predefined-template-delete"));

		await waitFor(() => {
			expect(deletePredefinedTemplate).toHaveBeenCalledWith("tpl-1");
		});

		expect(toastError).toHaveBeenCalledWith("Failed to delete template");
	});
});
