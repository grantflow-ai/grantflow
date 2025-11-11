import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { API } from "@/types/api-types";
import { AdminGrantingInstitutionClient } from "./admin-granting-institution-client";

const mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
};

const mockAdminStore = {
	getGrantingInstitution: vi.fn(),
	grantingInstitution: null as API.GetGrantingInstitution.Http200.ResponseBody | null,
	selectedGrantingInstitutionId: null as null | string,
};

const createMockInstitution = (): API.GetGrantingInstitution.Http200.ResponseBody => ({
	abbreviation: "NIH",
	created_at: "2024-01-01T00:00:00Z",
	full_name: "National Institutes of Health",
	id: "institution-123",
	source_count: 5,
	updated_at: "2024-01-01T00:00:00Z",
});

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
}));

vi.mock("@/stores/admin-store", () => ({
	useAdminStore: () => mockAdminStore,
}));

vi.mock("@/components/admin/layout/admin-granting-institution-layout", () => ({
	AdminGrantingInstitutionLayout: ({ activeTab, children }: any) => (
		<div data-active-tab={activeTab} data-testid="admin-granting-institution-layout">
			{children}
		</div>
	),
}));

vi.mock("@/components/admin/shared/admin-breadcrumb", () => ({
	AdminBreadcrumb: ({ institutionName, tabLabel }: any) => (
		<div data-institution-name={institutionName} data-tab-label={tabLabel} data-testid="admin-breadcrumb" />
	),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AdminGrantingInstitutionClient", () => {
	beforeEach(() => {
		mockAdminStore.selectedGrantingInstitutionId = "institution-123";
		mockAdminStore.grantingInstitution = createMockInstitution();
		mockRouter.replace.mockClear();
		mockAdminStore.getGrantingInstitution.mockClear();
	});

	describe("rendering with valid institution", () => {
		it("should render container when institution is loaded", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div data-testid="child-content">Test Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.getByTestId("admin-granting-institution-container")).toBeInTheDocument();
			expect(screen.getByTestId("child-content")).toBeInTheDocument();
		});

		it("should display institution name", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.getByText("National Institutes of Health")).toBeInTheDocument();
		});

		it("should display institution abbreviation", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.getByText("NIH")).toBeInTheDocument();
		});

		it("should not render abbreviation when not provided", () => {
			mockAdminStore.grantingInstitution = {
				...createMockInstitution(),
				abbreviation: null,
			} as any;

			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.queryByText("NIH")).not.toBeInTheDocument();
		});

		it("should render breadcrumb with correct props", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			const breadcrumb = screen.getByTestId("admin-breadcrumb");
			expect(breadcrumb).toHaveAttribute("data-institution-name", "National Institutes of Health");
			expect(breadcrumb).toHaveAttribute("data-tab-label", "Sources");
		});

		it("should render layout with correct active tab", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="predefined-templates">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			const layout = screen.getByTestId("admin-granting-institution-layout");
			expect(layout).toHaveAttribute("data-active-tab", "predefined-templates");
		});
	});

	describe("redirect when no institution selected", () => {
		it("should redirect to list when no institution ID", () => {
			mockAdminStore.selectedGrantingInstitutionId = null;
			mockAdminStore.grantingInstitution = null;

			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(mockRouter.replace).toHaveBeenCalledWith("/admin/granting-institutions");
		});

		it("should not render content when no institution", () => {
			mockAdminStore.selectedGrantingInstitutionId = null;
			mockAdminStore.grantingInstitution = null;

			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div data-testid="child-content">Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
		});
	});

	describe("loading institution data", () => {
		it("should fetch institution on mount when ID exists", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(mockAdminStore.getGrantingInstitution).toHaveBeenCalledWith("institution-123");
		});

		it("should not fetch institution when no ID", () => {
			mockAdminStore.selectedGrantingInstitutionId = null;
			mockAdminStore.grantingInstitution = null;

			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(mockAdminStore.getGrantingInstitution).not.toHaveBeenCalled();
		});
	});

	describe("tab labels", () => {
		it("should show Sources label for sources tab", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			const breadcrumb = screen.getByTestId("admin-breadcrumb");
			expect(breadcrumb).toHaveAttribute("data-tab-label", "Sources");
		});

		it("should show Predefined Templates label for predefined-templates tab", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="predefined-templates">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			const breadcrumb = screen.getByTestId("admin-breadcrumb");
			expect(breadcrumb).toHaveAttribute("data-tab-label", "Predefined Templates");
		});

		it("should show Edit label for edit tab", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="edit">
					<div>Content</div>
				</AdminGrantingInstitutionClient>,
			);

			const breadcrumb = screen.getByTestId("admin-breadcrumb");
			expect(breadcrumb).toHaveAttribute("data-tab-label", "Edit");
		});
	});

	describe("children rendering", () => {
		it("should render children inside layout", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div data-testid="child-1">First</div>
					<div data-testid="child-2">Second</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.getByTestId("child-1")).toBeInTheDocument();
			expect(screen.getByTestId("child-2")).toBeInTheDocument();
		});

		it("should handle nested children", () => {
			render(
				<AdminGrantingInstitutionClient activeTab="sources">
					<div data-testid="parent">
						<div data-testid="nested-child">Nested</div>
					</div>
				</AdminGrantingInstitutionClient>,
			);

			expect(screen.getByTestId("parent")).toBeInTheDocument();
			expect(screen.getByTestId("nested-child")).toBeInTheDocument();
		});
	});
});
