import { ListOrganizationsResponseFactory, ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

vi.mock("@/actions/organization");
vi.mock("@/actions/project");
vi.mock("@/utils/organization-context");
vi.mock("@/components/organizations/dashboard/dashboard-client");

const mockGetOrganizations = vi.mocked(await import("@/actions/organization").then((m) => m.getOrganizations));
const mockGetProjects = vi.mocked(await import("@/actions/project").then((m) => m.getProjects));
const mockGetOrganizationId = vi.mocked(await import("@/utils/organization-context").then((m) => m.getOrganizationId));
const mockDashboardClient = vi.mocked(
	await import("@/components/organizations/dashboard/dashboard-client").then((m) => m.DashboardClient),
);

describe("DashboardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDashboardClient.mockImplementation(() => <div data-testid="dashboard-client" />);
	});

	it("should render dashboard with organizations and projects", async () => {
		const organizations = ListOrganizationsResponseFactory.build();
		const projects = ProjectListItemFactory.batch(3);
		const selectedOrgId = organizations[0].id;

		mockGetOrganizations.mockResolvedValue(organizations);
		mockGetOrganizationId.mockResolvedValue(selectedOrgId);
		mockGetProjects.mockResolvedValue(projects);

		render(await DashboardPage());

		expect(screen.getByTestId("dashboard-client")).toBeInTheDocument();
		expect(mockDashboardClient).toHaveBeenCalledWith(
			{
				initialOrganizations: organizations,
				initialProjects: projects,
				initialSelectedOrganizationId: selectedOrgId,
			},
			undefined,
		);
	});

	it("should select first organization when none is selected", async () => {
		const organizations = ListOrganizationsResponseFactory.build();
		const projects = ProjectListItemFactory.batch(2);

		mockGetOrganizations.mockResolvedValue(organizations);
		mockGetOrganizationId.mockResolvedValue(null);
		mockGetProjects.mockResolvedValue(projects);

		render(await DashboardPage());

		expect(mockDashboardClient).toHaveBeenCalledWith(
			{
				initialOrganizations: organizations,
				initialProjects: [],
				initialSelectedOrganizationId: null,
			},
			undefined,
		);
	});

	it("should handle no organizations available", async () => {
		mockGetOrganizations.mockResolvedValue([]);
		mockGetOrganizationId.mockResolvedValue(null);

		render(await DashboardPage());

		expect(mockGetProjects).not.toHaveBeenCalled();
		expect(mockDashboardClient).toHaveBeenCalledWith(
			{
				initialOrganizations: [],
				initialProjects: [],
				initialSelectedOrganizationId: null,
			},
			undefined,
		);
	});

	it("should handle no selected organization with empty projects", async () => {
		const organizations = ListOrganizationsResponseFactory.build();

		mockGetOrganizations.mockResolvedValue(organizations);
		mockGetOrganizationId.mockResolvedValue(null);
		mockGetProjects.mockResolvedValue([]);

		render(await DashboardPage());

		expect(mockDashboardClient).toHaveBeenCalledWith(
			{
				initialOrganizations: organizations,
				initialProjects: [],
				initialSelectedOrganizationId: null,
			},
			undefined,
		);
	});
});
