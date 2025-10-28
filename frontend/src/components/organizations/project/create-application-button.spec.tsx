import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateApplicationButton } from "./create-application-button";

vi.mock("next/navigation");
vi.mock("@/stores/navigation-store");
vi.mock("@/stores/project-store");

const mockPush = vi.fn();
const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: mockPush,
	refresh: vi.fn(),
	replace: vi.fn(),
};

const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseNavigationStore = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseProjectStore = vi.mocked(await import("@/stores/project-store").then((m) => m.useProjectStore));

describe("CreateApplicationButton", () => {
	const project = {
		description: null,
		grant_applications: [],
		id: "project-456",
		logo_url: null,
		members: [],
		name: "Test Project",
		role: "OWNER" as const,
	};
	const navigateToProject = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseRouter.mockReturnValue(mockRouter);
		mockUseProjectStore.mockReturnValue(project);
		mockUseNavigationStore.mockReturnValue(navigateToProject);
	});

	it("renders create application button", () => {
		render(<CreateApplicationButton />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("New Application");
		expect(button).not.toBeDisabled();
	});

	it("navigates to project context and new application route on click", async () => {
		const user = userEvent.setup();
		render(<CreateApplicationButton />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(navigateToProject).toHaveBeenCalledWith(project.id, project.name);
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/new");
	});

	it("handles missing project gracefully", async () => {
		const user = userEvent.setup();
		mockUseProjectStore.mockReturnValue(null);
		mockUseNavigationStore.mockReturnValue(navigateToProject);

		render(<CreateApplicationButton />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(navigateToProject).not.toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/new");
	});

	it("applies custom className", () => {
		const customClass = "custom-button-class";
		render(<CreateApplicationButton className={customClass} />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toHaveClass(customClass);
	});
});
