import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import AppHeader from "@/components/layout/app-header";

describe.sequential("AppHeader", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders notification and avatar group", () => {
		const teamMembers = [
			{ backgroundColor: "#369e94", initials: "NH" },
			{ backgroundColor: "#9e366f", initials: "VH" },
		];

		render(<AppHeader projectTeamMembers={teamMembers} />);

		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();

		expect(screen.getByTestId("dashboard-notification")).toBeInTheDocument();

		expect(screen.getByTestId("dashboard-avatar-group")).toBeInTheDocument();
	});
});
