import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import useSWR from "swr";
import { DashboardStats } from "./dashboard-stats";

vi.mock("swr", () => ({
	default: vi.fn(),
}));

vi.mock("@/actions/project", () => ({
	getProjects: vi.fn(),
}));

describe("DashboardStats", () => {
	const mockProjects = [
		ProjectListItemFactory.build({ applications_count: 3 }),
		ProjectListItemFactory.build({ applications_count: 1 }),
		ProjectListItemFactory.build({ applications_count: 0 }),
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("displays correct project count", () => {
		vi.mocked(useSWR).mockReturnValue({
			data: mockProjects,
		} as any);

		render(<DashboardStats initialProjects={mockProjects} />);

		expect(screen.getByTestId("project-count")).toHaveTextContent("3");
		expect(screen.getByText("Research projects")).toBeInTheDocument();
	});

	it("calculates and displays correct application count", () => {
		vi.mocked(useSWR).mockReturnValue({
			data: mockProjects,
		} as any);

		render(<DashboardStats initialProjects={mockProjects} />);

		expect(screen.getByTestId("application-count")).toHaveTextContent("4");
		expect(screen.getByText("Applications")).toBeInTheDocument();
	});

	it("uses fallback data when SWR data is not available", () => {
		vi.mocked(useSWR).mockReturnValue({
			data: undefined,
		} as any);

		render(<DashboardStats initialProjects={mockProjects} />);

		expect(screen.getByTestId("project-count")).toHaveTextContent("3");
		expect(screen.getByTestId("application-count")).toHaveTextContent("4");
	});

	it("handles empty projects array", () => {
		const emptyProjects: any[] = [];
		vi.mocked(useSWR).mockReturnValue({
			data: emptyProjects,
		} as any);

		render(<DashboardStats initialProjects={emptyProjects} />);

		expect(screen.getByTestId("project-count")).toHaveTextContent("0");
		expect(screen.getByTestId("application-count")).toHaveTextContent("0");
	});

	it("handles projects with no applications", () => {
		const projectsWithNoApps = [
			ProjectListItemFactory.build({ applications_count: 0 }),
			ProjectListItemFactory.build({ applications_count: 0 }),
		];

		vi.mocked(useSWR).mockReturnValue({
			data: projectsWithNoApps,
		} as any);

		render(<DashboardStats initialProjects={projectsWithNoApps} />);

		expect(screen.getByTestId("project-count")).toHaveTextContent("2");
		expect(screen.getByTestId("application-count")).toHaveTextContent("0");
	});

	it("configures SWR with correct options", () => {
		render(<DashboardStats initialProjects={mockProjects} />);

		expect(useSWR).toHaveBeenCalledWith("projects", expect.any(Function), {
			fallbackData: mockProjects,
			revalidateOnFocus: false,
		});
	});
});
