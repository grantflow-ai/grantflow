import { ApplicationWithTemplateFactory, ProjectFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";
import { NewApplicationClient } from "./new-application-client";

const mockRouterReplace = vi.fn();
const mockRouterBack = vi.fn();
const mockToast = vi.hoisted(() => ({
	dismiss: vi.fn(),
	error: vi.fn(),
	loading: vi.fn(),
	success: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		back: mockRouterBack,
		replace: mockRouterReplace,
	}),
}));

vi.mock("sonner", () => ({
	toast: mockToast,
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("NewApplicationClient", () => {
	const mockProject = ProjectFactory.build();
	const mockOrganizationId = "org-123";

	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();

		useProjectStore.setState({ project: mockProject });
		useOrganizationStore.setState({ selectedOrganizationId: mockOrganizationId });
	});

	afterEach(() => {
		cleanup();
	});

	describe("Loading State", () => {
		it("shows loading state when project is missing", () => {
			useProjectStore.setState({ project: null });

			render(<NewApplicationClient />);

			expect(screen.queryByTestId("grant-type-options")).not.toBeInTheDocument();
			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});

		it("shows loading state when organization is missing", () => {
			useOrganizationStore.setState({ selectedOrganizationId: null });

			render(<NewApplicationClient />);

			expect(screen.queryByTestId("grant-type-options")).not.toBeInTheDocument();
			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Grant Type Selection", () => {
		it("displays both grant type cards", () => {
			render(<NewApplicationClient />);

			expect(screen.getByTestId("grant-type-card-basic-science")).toBeInTheDocument();
			expect(screen.getByTestId("grant-type-card-translational-research")).toBeInTheDocument();
		});

		it("displays grant type options container", () => {
			render(<NewApplicationClient />);

			expect(screen.getByTestId("grant-type-options")).toBeInTheDocument();
		});
	});

	describe("Application Creation - Basic Science", () => {
		it("creates Basic Science application when card is clicked", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build({
				id: "app-123",
				title: "Untitled Application",
			});

			const mockCreateApplication = vi.fn().mockImplementation(async () => {
				useApplicationStore.setState({ application: mockApplication });
				return mockApplication;
			});

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			expect(mockToast.loading).toHaveBeenCalledWith("Creating application...", {
				id: "create-application",
			});

			await waitFor(() => {
				expect(mockCreateApplication).toHaveBeenCalledWith(
					mockOrganizationId,
					mockProject.id,
					"RESEARCH",
					"Untitled Application",
				);
			});
		});

		it("navigates to wizard after successful creation", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build({
				id: "app-123",
				title: "Untitled Application",
			});

			const mockCreateApplication = vi.fn().mockImplementation(async () => {
				useApplicationStore.setState({ application: mockApplication });
				return mockApplication;
			});

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(mockToast.dismiss).toHaveBeenCalledWith("create-application");
			});

			expect(mockRouterReplace).toHaveBeenCalledWith(routes.organization.project.application.wizard());

			const navigationState = useNavigationStore.getState();
			expect(navigationState.activeApplicationId).toBe(mockApplication.id);
		});

		it("disables both cards during creation", async () => {
			const user = userEvent.setup();
			const mockCreateApplication = vi.fn().mockImplementation(
				() =>
					new Promise(() => {
						/* intentionally never resolve to simulate pending request */
					}),
			);

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			const translationalCard = screen.getByTestId("grant-type-card-translational-research");

			await user.click(basicScienceCard);

			expect(basicScienceCard).toBeDisabled();
			expect(translationalCard).toBeDisabled();
		});
	});

	describe("Application Creation - Translational Research", () => {
		it("creates Translational Research application when card is clicked", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build({
				id: "app-456",
				title: "Untitled Application",
			});

			const mockCreateApplication = vi.fn().mockImplementation(async () => {
				useApplicationStore.setState({ application: mockApplication });
				return mockApplication;
			});
			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const translationalCard = screen.getByTestId("grant-type-card-translational-research");
			await user.click(translationalCard);

			expect(mockToast.loading).toHaveBeenCalledWith("Creating application...", {
				id: "create-application",
			});

			await waitFor(() => {
				expect(mockCreateApplication).toHaveBeenCalledWith(
					mockOrganizationId,
					mockProject.id,
					"TRANSLATIONAL",
					"Untitled Application",
				);
			});

			await waitFor(() => {
				expect(mockToast.dismiss).toHaveBeenCalledWith("create-application");
			});

			expect(mockRouterReplace).toHaveBeenCalledWith(routes.organization.project.application.wizard());

			const navigationState = useNavigationStore.getState();
			expect(navigationState.activeApplicationId).toBe(mockApplication.id);
		});

		it("navigates to wizard after successful creation", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build({
				id: "app-456",
				title: "Untitled Application",
			});

			const mockCreateApplication = vi.fn().mockImplementation(async () => {
				useApplicationStore.setState({ application: mockApplication });
				return mockApplication;
			});

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const translationalCard = screen.getByTestId("grant-type-card-translational-research");
			await user.click(translationalCard);

			await waitFor(() => {
				expect(mockToast.dismiss).toHaveBeenCalledWith("create-application");
			});

			expect(mockRouterReplace).toHaveBeenCalledWith(routes.organization.project.application.wizard());

			const navigationState = useNavigationStore.getState();
			expect(navigationState.activeApplicationId).toBe(mockApplication.id);
		});
	});

	describe("Error Handling", () => {
		it("shows error toast when organization ID is missing during creation", async () => {
			useOrganizationStore.setState({ selectedOrganizationId: null });

			render(<NewApplicationClient />);

			expect(screen.queryByTestId("grant-type-options")).not.toBeInTheDocument();
		});

		it("shows error toast when application creation fails", async () => {
			const user = userEvent.setup();
			const error = new Error("Network error");

			const mockCreateApplication = vi.fn().mockRejectedValue(error);
			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith("Failed to create application. Please try again.", {
					id: "create-application",
				});
			});

			expect(mockRouterReplace).not.toHaveBeenCalled();
			const navigationState = useNavigationStore.getState();
			expect(navigationState.activeApplicationId).toBeNull();
			expect(navigationState.activeProjectId).toBeNull();
		});

		it("re-enables cards after creation failure", async () => {
			const user = userEvent.setup();

			const mockCreateApplication = vi.fn().mockRejectedValue(new Error("Creation failed"));
			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalled();
			});

			expect(basicScienceCard).not.toBeDisabled();
		});

		it("shows error when application is not created in store", async () => {
			const user = userEvent.setup();

			const mockCreateApplication = vi.fn().mockResolvedValue(undefined);

			useApplicationStore.setState({
				createApplication: mockCreateApplication,
			});

			const originalGetState = useApplicationStore.getState;
			vi.spyOn(useApplicationStore, "getState").mockReturnValue({
				...originalGetState(),
				application: null,
			});

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith("Failed to create application. Please try again.", {
					id: "create-application",
				});
			});

			expect(mockRouterReplace).not.toHaveBeenCalled();

			vi.restoreAllMocks();
		});

		it("logs error when creation fails", async () => {
			const user = userEvent.setup();
			const error = new Error("Test error");

			const mockCreateApplication = vi.fn().mockRejectedValue(error);
			useApplicationStore.setState({ createApplication: mockCreateApplication });

			const { log } = await import("@/utils/logger/client");

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(log.error).toHaveBeenCalledWith("create-application", error);
			});
		});
	});

	describe("Duplicate Creation Prevention", () => {
		it("prevents duplicate creation when card is clicked multiple times", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build();

			const mockCreateApplication = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => {
							useApplicationStore.setState({ application: mockApplication });
							resolve(undefined);
						}, 100),
					),
			);

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");

			await user.click(basicScienceCard);
			await user.click(basicScienceCard);
			await user.click(basicScienceCard);

			expect(mockCreateApplication).toHaveBeenCalledTimes(1);
		});

		it("prevents clicking different card while creation is in progress", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build();

			const mockCreateApplication = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => {
							useApplicationStore.setState({ application: mockApplication });
							resolve(undefined);
						}, 100),
					),
			);

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			const translationalCard = screen.getByTestId("grant-type-card-translational-research");

			await user.click(basicScienceCard);
			await user.click(translationalCard);

			expect(mockCreateApplication).toHaveBeenCalledTimes(1);
			expect(mockCreateApplication).toHaveBeenCalledWith(
				mockOrganizationId,
				mockProject.id,
				"RESEARCH",
				"Untitled Application",
			);
		});
	});

	describe("Back Button", () => {
		it("renders back button", () => {
			render(<NewApplicationClient />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("navigates back when back button is clicked", async () => {
			const user = userEvent.setup();
			render(<NewApplicationClient />);

			const backButton = screen.getByTestId("back-button");
			await user.click(backButton);

			expect(mockRouterBack).toHaveBeenCalledTimes(1);
		});

		it("disables back button during application creation", async () => {
			const user = userEvent.setup();
			const mockApplication = ApplicationWithTemplateFactory.build();

			const mockCreateApplication = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => {
							useApplicationStore.setState({ application: mockApplication });
							resolve(undefined);
						}, 100),
					),
			);

			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			const backButton = screen.getByTestId("back-button");

			await user.click(basicScienceCard);

			expect(backButton).toBeDisabled();
		});

		it("re-enables back button after creation failure", async () => {
			const user = userEvent.setup();

			const mockCreateApplication = vi.fn().mockRejectedValue(new Error("Creation failed"));
			useApplicationStore.setState({ createApplication: mockCreateApplication });

			render(<NewApplicationClient />);

			const basicScienceCard = screen.getByTestId("grant-type-card-basic-science");
			const backButton = screen.getByTestId("back-button");

			await user.click(basicScienceCard);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalled();
			});

			expect(backButton).not.toBeDisabled();
		});
	});

	describe("Layout and Structure", () => {
		it("renders grant type options and main content", () => {
			render(<NewApplicationClient />);

			expect(screen.getByTestId("grant-type-options")).toBeInTheDocument();
			expect(screen.getByRole("main")).toBeInTheDocument();
		});

		it("renders back button in footer", () => {
			render(<NewApplicationClient />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});
	});
});
