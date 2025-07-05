import { render, screen } from "@testing-library/react";
import { ProjectListItemFactory } from "::testing/factories";
import { useUserStore } from "@/stores/user-store";
import { DashboardClient } from "./dashboard-client";

// Mock the user store
vi.mock("@/stores/user-store");

// Mock data for initialProjects
const initialProjects = [ProjectListItemFactory.build()];

describe("DashboardClient", () => {
	beforeEach(() => {
		// Mock the user store to prevent welcome modal from showing
		vi.mocked(useUserStore).mockReturnValue({
			hasSeenWelcomeModal: true, // This prevents the modal from showing
			dismissWelcomeModal: vi.fn(),
		} as any);
	});

	it("renders dashboard header and stats", () => {
		render(<DashboardClient initialProjects={initialProjects} />);

		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
		expect(screen.getByTestId("project-count")).toBeInTheDocument();
		expect(screen.getByTestId("application-count")).toBeInTheDocument();
	});

	it("renders project cards when projects exist", () => {
		render(<DashboardClient initialProjects={initialProjects} />);

		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
	});

	it("renders empty state when there are no projects", () => {
		render(<DashboardClient initialProjects={[]} />);

		expect(screen.getByTestId("create-first-project-button")).toBeInTheDocument();
	});

	it("renders invite collaborators button", () => {
		render(<DashboardClient initialProjects={initialProjects} />);

		expect(screen.getByTestId("invite-collaborators-button")).toBeInTheDocument();
	});
});
