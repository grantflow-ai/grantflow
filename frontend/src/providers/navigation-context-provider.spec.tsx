import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationFactory, ListOrganizationsResponseFactory, ProjectFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";

import { NavigationContextProvider } from "./navigation-context-provider";

const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: vi.fn(),
	refresh: vi.fn(),
	replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
}));

vi.mock("@/actions/grant-applications", () => ({
	getApplication: vi.fn(),
}));

vi.mock("@/actions/project", () => ({
	getProject: vi.fn(),
}));

vi.mock("@/actions/organization", () => ({
	getOrganizations: vi.fn(),
}));

vi.mock("@/hooks/use-org-cookie", () => ({
	useOrgCookie: vi.fn(),
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("NavigationContextProvider", () => {
	beforeEach(async () => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();

		const { getOrganizations } = await import("@/actions/organization");
		const mockOrganizations = ListOrganizationsResponseFactory.build();
		vi.mocked(getOrganizations).mockResolvedValue(Object.values(mockOrganizations));

		const { useOrgCookie } = await import("@/hooks/use-org-cookie");
		vi.mocked(useOrgCookie).mockReturnValue({
			clearOrganizationCookie: vi.fn(),
			selectedOrganizationId: null,
			setOrganizationCookie: vi.fn(),
		});
	});

	afterEach(() => {
		resetAllStores();
	});

	describe("basic rendering", () => {
		it("should render children when no requirements", () => {
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });

			render(
				<NavigationContextProvider>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(screen.getByTestId("children")).toBeInTheDocument();
		});

		it("should render children when all requirements are met", () => {
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useNavigationStore.setState({
				activeApplicationId: "app-123",
				activeProjectId: "project-123",
			});

			render(
				<NavigationContextProvider requireApplication requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(screen.getByTestId("children")).toBeInTheDocument();
		});
	});

	describe("redirection logic", () => {
		it("should redirect when no organization is selected", async () => {
			useOrganizationStore.setState({
				selectedOrganizationId: null,
			});
			const { getOrganizations } = await import("@/actions/organization");
			vi.mocked(getOrganizations).mockResolvedValue(Object.values([]));
			render(
				<NavigationContextProvider>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/projects");
			});
		});

		it("should redirect when project is required but not provided", () => {
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useNavigationStore.setState({ activeProjectId: null });

			render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(mockRouter.replace).toHaveBeenCalledWith("/projects");
		});

		it("should redirect when application is required but not provided", () => {
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useNavigationStore.setState({
				activeApplicationId: null,
				activeProjectId: "project-123",
			});

			render(
				<NavigationContextProvider requireApplication requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(mockRouter.replace).toHaveBeenCalledWith("/projects");
		});

		it("should use custom redirect path", async () => {
			useOrganizationStore.setState({ selectedOrganizationId: null });

			render(
				<NavigationContextProvider redirectTo="/custom-path">
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/custom-path");
			});
		});
	});

	describe("data loading", () => {
		it("should load project data when required", async () => {
			const { getProject } = await import("@/actions/project");
			const mockProject = ProjectFactory.build();
			vi.mocked(getProject).mockResolvedValue(mockProject);

			const setProjectSpy = vi.spyOn(useProjectStore.getState(), "setProject");

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({ activeProjectId: "project-123" });

			render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(getProject).toHaveBeenCalledWith("org-123", "project-123");
				expect(setProjectSpy).toHaveBeenCalledWith(mockProject);
			});
		});

		it("should load application data when required", async () => {
			const { getApplication } = await import("@/actions/grant-applications");
			const mockApplication = ApplicationFactory.build();
			vi.mocked(getApplication).mockResolvedValue(mockApplication);

			const setApplicationSpy = vi.spyOn(useApplicationStore.getState(), "setApplication");

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({
				activeApplicationId: "app-123",
				activeProjectId: "project-123",
				stateHydrated: true,
			});

			render(
				<NavigationContextProvider requireApplication>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(getApplication).toHaveBeenCalledWith("org-123", "project-123", "app-123");
				expect(setApplicationSpy).toHaveBeenCalledWith(mockApplication);
			});
		});

		it("should load both project and application when both required", async () => {
			const { getProject } = await import("@/actions/project");
			const { getApplication } = await import("@/actions/grant-applications");

			const mockProject = ProjectFactory.build();
			const mockApplication = ApplicationFactory.build();

			vi.mocked(getProject).mockResolvedValue(mockProject);
			vi.mocked(getApplication).mockResolvedValue(mockApplication);

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({
				activeApplicationId: "app-123",
				activeProjectId: "project-123",
			});

			render(
				<NavigationContextProvider requireApplication requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(getProject).toHaveBeenCalledWith("org-123", "project-123");
				expect(getApplication).toHaveBeenCalledWith("org-123", "project-123", "app-123");
			});
		});
	});

	describe("error handling", () => {
		it("should show error and redirect when project loading fails", async () => {
			const { getProject } = await import("@/actions/project");
			vi.mocked(getProject).mockRejectedValue(new Error("Project not found"));

			const clearActiveProjectSpy = vi.spyOn(useNavigationStore.getState(), "clearActiveProject");

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({ activeProjectId: "project-123" });

			render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(screen.getByText("Project not found")).toBeInTheDocument();
				expect(screen.getByText("Redirecting in 2 seconds...")).toBeInTheDocument();
			});

			expect(clearActiveProjectSpy).toHaveBeenCalled();
		});

		it("should show error and redirect when application loading fails", async () => {
			const { getApplication } = await import("@/actions/grant-applications");
			vi.mocked(getApplication).mockRejectedValue(new Error("Application not found"));

			const clearActiveApplicationSpy = vi.spyOn(useNavigationStore.getState(), "clearActiveApplication");

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({
				activeApplicationId: "app-123",
				activeProjectId: "project-123",
			});

			render(
				<NavigationContextProvider requireApplication>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(screen.getByText("Application not found")).toBeInTheDocument();
				expect(screen.getByText("Redirecting in 2 seconds...")).toBeInTheDocument();
			});

			expect(clearActiveApplicationSpy).toHaveBeenCalled();
		});

		it.skip("should redirect after 2 seconds when error occurs", async () => {
			const { getProject } = await import("@/actions/project");
			vi.mocked(getProject).mockRejectedValue(new Error("Project not found"));

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: vi.fn(),
				selectedOrganizationId: "org-123",
				setOrganizationCookie: vi.fn(),
			});

			useNavigationStore.setState({ activeProjectId: "project-123" });

			vi.useFakeTimers();

			render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(screen.getByText("Project not found")).toBeInTheDocument();
			});

			expect(mockRouter.replace).not.toHaveBeenCalled();

			vi.advanceTimersByTime(2000);

			expect(mockRouter.replace).toHaveBeenCalledWith("/projects");

			vi.useRealTimers();
		});
	});

	describe("state management", () => {
		it("should not load data when organization ID is missing", async () => {
			const { getProject } = await import("@/actions/project");

			useOrganizationStore.setState({ selectedOrganizationId: null });
			useNavigationStore.setState({ activeProjectId: "project-123" });

			render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(getProject).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(mockRouter.replace).toHaveBeenCalledWith("/projects");
			});
		});

		it("should handle missing navigation state gracefully", async () => {
			const { getApplication } = await import("@/actions/grant-applications");

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			useNavigationStore.setState({
				activeApplicationId: null,
				activeProjectId: null,
			});

			render(
				<NavigationContextProvider requireApplication>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			expect(getApplication).not.toHaveBeenCalled();
			expect(mockRouter.replace).toHaveBeenCalledWith("/projects");
		});
	});

	describe("cleanup", () => {
		it.skip("should clear timeout on unmount", async () => {
			const { getProject } = await import("@/actions/project");
			vi.mocked(getProject).mockRejectedValue(new Error("Project not found"));

			useOrganizationStore.setState({
				organizations: Object.values(ListOrganizationsResponseFactory.build()),
				selectedOrganizationId: "org-123",
			});
			useNavigationStore.setState({ activeProjectId: "project-123" });

			vi.useFakeTimers();
			const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

			const { unmount } = render(
				<NavigationContextProvider requireProject>
					<div data-testid="children">Test content</div>
				</NavigationContextProvider>,
			);

			await waitFor(() => {
				expect(screen.getByText("Project not found")).toBeInTheDocument();
			});

			unmount();

			expect(clearTimeoutSpy).toHaveBeenCalled();

			vi.useRealTimers();
		});
	});
});
