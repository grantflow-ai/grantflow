import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { API } from "@/types/api-types";
import { AdminPredefinedTemplatesContent } from "./admin-predefined-templates-content";

const mockAdminStore = {
	selectedGrantingInstitutionId: "institution-123",
};

const mockListPredefinedTemplates = vi.fn();

const createMockTemplate = (id: string): API.ListGrantingInstitutionPredefinedTemplates.Http200.ResponseBody[0] => ({
	activity_code: "R01",
	created_at: "2024-01-01T00:00:00Z",
	grant_type: "Research Grant",
	granting_institution: {
		full_name: "National Institutes of Health",
		id: "institution-123",
	},
	id,
	name: `Template ${id}`,
	sections_count: 5,
	updated_at: "2024-01-01T00:00:00Z",
});

vi.mock("@/stores/admin-store", () => ({
	useAdminStore: () => mockAdminStore,
}));

vi.mock("@/actions/predefined-templates", () => ({
	listPredefinedTemplates: (...args: any[]) => mockListPredefinedTemplates(...args),
}));

vi.mock("@/components/admin/predefined-templates/predefined-template-list", () => ({
	PredefinedTemplateList: ({ templates }: any) => (
		<div data-testid="predefined-template-list">
			{templates.map((template: any) => (
				<div data-testid={`template-${template.id}`} key={template.id}>
					{template.name}
				</div>
			))}
		</div>
	),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, ...props }: any) => (
		<button data-testid={props["data-testid"]} type="button">
			{children}
		</button>
	),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AdminPredefinedTemplatesContent", () => {
	beforeEach(() => {
		mockAdminStore.selectedGrantingInstitutionId = "institution-123";
		mockListPredefinedTemplates.mockResolvedValue([]);
	});

	describe("loading state", () => {
		it("should show loading spinner initially", () => {
			mockListPredefinedTemplates.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve([]);
						}, 1000);
					}),
			);

			render(<AdminPredefinedTemplatesContent />);

			expect(screen.getByTestId("templates-loading")).toBeInTheDocument();
			expect(screen.getByText("Loading templates...")).toBeInTheDocument();
		});

		it("should not show content while loading", () => {
			mockListPredefinedTemplates.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve([]);
						}, 1000);
					}),
			);

			render(<AdminPredefinedTemplatesContent />);

			expect(screen.queryByTestId("predefined-templates-content")).not.toBeInTheDocument();
		});
	});

	describe("fetching templates", () => {
		it("should fetch templates on mount", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(mockListPredefinedTemplates).toHaveBeenCalledWith({
					grantingInstitutionId: "institution-123",
				});
			});
		});

		it("should not fetch when no institution selected", async () => {
			mockAdminStore.selectedGrantingInstitutionId = null as any;

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(mockListPredefinedTemplates).not.toHaveBeenCalled();
			});
		});

		it("should refetch when institution changes", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			const { rerender } = render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(mockListPredefinedTemplates).toHaveBeenCalledTimes(1);
			});

			mockAdminStore.selectedGrantingInstitutionId = "institution-456";
			rerender(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(mockListPredefinedTemplates).toHaveBeenCalledTimes(2);
				expect(mockListPredefinedTemplates).toHaveBeenLastCalledWith({
					grantingInstitutionId: "institution-456",
				});
			});
		});
	});

	describe("rendering templates", () => {
		it("should render title and description", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(screen.getByText("Predefined templates")).toBeInTheDocument();
				expect(
					screen.getByText("Manage catalog templates that can be cloned into applications."),
				).toBeInTheDocument();
			});
		});

		it("should render create template button", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("predefined-template-create-button")).toBeInTheDocument();
			});
		});

		it("should render template list", async () => {
			const templates = [createMockTemplate("template-1"), createMockTemplate("template-2")];
			mockListPredefinedTemplates.mockResolvedValue(templates);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("predefined-template-list")).toBeInTheDocument();
				expect(screen.getByTestId("template-template-1")).toBeInTheDocument();
				expect(screen.getByTestId("template-template-2")).toBeInTheDocument();
			});
		});

		it("should pass templates to list component", async () => {
			const templates = [createMockTemplate("template-1")];
			mockListPredefinedTemplates.mockResolvedValue(templates);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(screen.getByText("Template template-1")).toBeInTheDocument();
			});
		});
	});

	describe("responsive design", () => {
		it("should use responsive classes for header", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			const { container } = render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				const header = container.querySelector(".md\\:flex-row");
				expect(header).toBeInTheDocument();
			});
		});
	});

	describe("content container", () => {
		it("should render main content container", async () => {
			mockListPredefinedTemplates.mockResolvedValue([]);

			render(<AdminPredefinedTemplatesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("predefined-templates-content")).toBeInTheDocument();
			});
		});

		it("should hide content while loading", () => {
			mockListPredefinedTemplates.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve([]);
						}, 1000);
					}),
			);

			render(<AdminPredefinedTemplatesContent />);

			expect(screen.queryByTestId("predefined-templates-content")).not.toBeInTheDocument();
			expect(screen.getByTestId("templates-loading")).toBeInTheDocument();
		});
	});
});
