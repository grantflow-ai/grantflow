import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { API } from "@/types/api-types";
import { AdminGrantingInstitutionEditContent } from "./admin-granting-institution-edit-content";

const mockAdminStore = {
	grantingInstitution: null as API.GetGrantingInstitution.Http200.ResponseBody | null,
};

const createMockInstitution = (): API.GetGrantingInstitution.Http200.ResponseBody => ({
	abbreviation: "NIH",
	created_at: "2024-01-01T00:00:00Z",
	full_name: "National Institutes of Health",
	id: "institution-123",
	source_count: 5,
	updated_at: "2024-01-01T00:00:00Z",
});

vi.mock("@/stores/admin-store", () => ({
	useAdminStore: () => mockAdminStore,
}));

vi.mock("@/components/admin/granting-institutions/granting-institution-form", () => ({
	GrantingInstitutionForm: ({ institution, mode }: any) => (
		<div data-institution-id={institution?.id} data-mode={mode} data-testid="granting-institution-form">
			Form for {mode}
		</div>
	),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AdminGrantingInstitutionEditContent", () => {
	beforeEach(() => {
		mockAdminStore.grantingInstitution = createMockInstitution();
	});

	describe("rendering with institution", () => {
		it("should render edit content container", () => {
			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.getByTestId("admin-edit-content")).toBeInTheDocument();
		});

		it("should render title", () => {
			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.getByText("Edit Granting Institution")).toBeInTheDocument();
		});

		it("should render description", () => {
			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.getByText("Update the details of this granting institution")).toBeInTheDocument();
		});

		it("should render form with institution and edit mode", () => {
			render(<AdminGrantingInstitutionEditContent />);

			const form = screen.getByTestId("granting-institution-form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute("data-mode", "edit");
			expect(form).toHaveAttribute("data-institution-id", "institution-123");
		});
	});

	describe("no institution state", () => {
		it("should show message when no institution selected", () => {
			mockAdminStore.grantingInstitution = null;

			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.getByTestId("edit-no-institution")).toBeInTheDocument();
			expect(screen.getByText("No institution selected")).toBeInTheDocument();
		});

		it("should not render form when no institution", () => {
			mockAdminStore.grantingInstitution = null;

			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.queryByTestId("granting-institution-form")).not.toBeInTheDocument();
		});

		it("should not render title when no institution", () => {
			mockAdminStore.grantingInstitution = null;

			render(<AdminGrantingInstitutionEditContent />);

			expect(screen.queryByText("Edit Granting Institution")).not.toBeInTheDocument();
		});
	});

	describe("styling", () => {
		it("should apply correct container styles", () => {
			render(<AdminGrantingInstitutionEditContent />);

			const container = screen.getByTestId("admin-edit-content");
			expect(container).toHaveClass("flex", "flex-col", "h-full");
		});

		it("should use semantic text sizes", () => {
			render(<AdminGrantingInstitutionEditContent />);

			const heading = screen.getByText("Edit Granting Institution");
			expect(heading).toHaveClass("text-2xl");

			const description = screen.getByText("Update the details of this granting institution");
			expect(description).toHaveClass("text-muted-foreground-dark", "leading-tight");
		});
	});
});
