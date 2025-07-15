import { render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/layout/app-header";

describe("AppHeader", () => {
	it("renders notification and avatar group", () => {
		const teamMembers = [
			{ backgroundColor: "#369e94", initials: "NH" },
			{ backgroundColor: "#9e366f", initials: "VH" },
		];

		render(<AppHeader projectTeamMembers={teamMembers} />);

		// Assert the container
		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();

		// Assert notification area
		expect(screen.getByTestId("dashboard-notification")).toBeInTheDocument();

		// Assert avatar group
		expect(screen.getByTestId("dashboard-avatar-group")).toBeInTheDocument();
	});
});
